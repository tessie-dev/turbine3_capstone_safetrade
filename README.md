# SafeTrade Capstone

A decentralized escrow program on Solana that implements time-constrained settlements and arbitration voting for secure peer-to-peer transactions.

## Overview

SafeTrade is an on-chain escrow system designed to protect both buyers and sellers in peer-to-peer transactions. The system enforces trade completion guarantees through:

1. **Escrow-based custody**: Buyer funds are held in a program-controlled vault until the transaction is finalized
2. **Time-based settlement**: After payment, a 7-day confirmation window gives buyers time to verify delivery. If the buyer doesn't confirm within this period, funds automatically release to the seller
3. **Dispute resolution mechanism**: Either party can raise a dispute during the funded period, triggering a 3-day arbitration vote where independent arbitrators decide the outcome (one-person-one-vote)
4. **On-chain enforcement**: All settlement logic runs on Solana smart contracts, eliminating reliance on frontend timers or centralized oracles


---

## Account Architecture

The escrow system uses three types of accounts. Each order is represented by one `EscrowAccount` PDA, and all other PDAs are derived from it.

### Account Hierarchy (One Order)
```
Alice Wallet ── create_escrow ──┐
                                │
                                ▼
                        ┌─────────────┐
                        │EscrowAccount│  (PDA: ["escrow", seller, listing_id])
                        │  - state    │
                        └──┬────┬─────┘
                           │    │
            ┌──────────────┘    └───────────────────┐
            │                                       │
            ▼                                       ▼
        ┌─────────────┐                           (Dispute only)
        │   Vault     │                         ┌────────────────────┐
        │ (PDA wallet)│                         │   VoteReceipt PDA  │
        └─────────────┘                         │ (one per arbitrator)
                ▲                               └────────────────────┘
                │
        Bob Wallet ── fund_escrow (SOL)
```

### Authority Model
- **EscrowAccount (state PDA)**: Owned by the program, stores order data (seller, buyer, amount, status, timestamps).
- **Vault (PDA wallet)**: Owned by the System Program, but controlled by the program via PDA signing. This account holds the escrowed SOL.
- **VoteReceipt (PDA)**: Owned by the program, created per arbitrator per escrow to prevent double voting.

**Key Insight:**
- These accounts are independent on-chain accounts, not nested inside each other.
- They are logically linked through PDA seeds derived from the same `EscrowAccount`.

---

## Trade Status States

### `TradeStatus` Enum
```rust
Created      // Order created, awaiting payment
Funded       // Buyer paid, 7-day countdown started
InDispute    // Dispute raised, voting in progress
Completed    // Funds released to seller (trade successful)
Cancelled    // Order cancelled before funding (never paid)
Refunded     // Funds returned to buyer after payment (dispute/error)
```

### Key Assumption: Funded = Seller Fulfillment Begins

**When a buyer calls `fund_escrow` and the status changes to `Funded`:**
- **Assumption**: The seller will immediately see the payment and begin fulfillment (shipping goods, providing service, etc.)
- **Simplified Model**: We do NOT track "seller shipped" as a separate on-chain state to keep the program simple
- **Consequence**: The 7-day expiration timer starts from funding, not from a hypothetical "shipment confirmation"

This design trusts that sellers will act in good faith once funds are escrowed. If the seller never ships, the buyer can:
1. Raise a dispute before expiration
2. Provide evidence to arbitrators
3. Get a refund via `resolve_dispute` if arbitrators vote in their favor

---

## Business Flows

### 1. Normal Completion Flow
```
Created (seller creates order)
  ↓ fund_escrow (buyer pays, expire_at = now + 7 days)
Funded (seller sees payment, begins shipping)
  ↓ complete_escrow (buyer confirms receipt within 7 days)
Completed (funds → seller)
```

### 2. Expiration Auto-Payout
```
Created
  ↓ fund_escrow
Funded (7-day timer starts, seller ships)
  ↓ (buyer doesn't confirm for 7+ days)
  ↓ claim_after_expire (anyone can trigger)
Completed (funds → seller)
```

### 3. Dispute Resolution
```
Created
  ↓ fund_escrow
Funded
  ↓ raise_dispute (buyer or seller initiates, 3-day voting window)
InDispute
  ↓ vote_on_dispute (arbitrators vote: 1 vote each)
  ↓ (voting period ends)
  ↓ resolve_dispute
Completed (if seller votes > buyer votes) OR Refunded (otherwise, funds → buyer)
```

**Tie-breaking rule**: If `votes_for_seller == votes_for_buyer`, buyer wins (conservative default).

### 4. Cancel Before Funding
```
Created
  ↓ cancel_escrow (seller cancels)
Cancelled
```

---

## State Machine

```
            ┌─────────┐
            │ Created │──────cancel_escrow──────┐
            └────┬────┘                         │
                 │                              │
            fund_escrow                         │
                 │                              │
                 ▼                              ▼
             ┌─────────┐                   ┌──────────┐
        ┌────│ Funded  │────┐              │Cancelled │
        │    └────┬────┘    │              └──────────┘
        │         │         │
        │ complete│  raise_ │  claim_after_expire
        │ _escrow │  dispute│  (after 7 days)
        │         │         │
        ▼         ▼         ▼
┌───────────┐ ┌──────────┐ ┌───────────┐
│ Completed │ │InDispute │ │ Completed │
└───────────┘ └────┬─────┘ └───────────┘
                   │
            vote_on_dispute
                   │
            resolve_dispute
                   │
           ┌───────┴────────┐
           ▼                ▼
      ┌───────────┐    ┌──────────┐
      │ Completed │    │ Refunded │
      └───────────┘    └──────────┘
```

**Critical Rules:**
1. Once `InDispute`, cannot use `complete_escrow` or `claim_after_expire` (must resolve via voting)
2. Expiration timestamp (`expire_at`) only enforced when `status == Funded`
3. `VoteReceipt` uses `init` constraint (not `init_if_needed`), preventing duplicate votes
4. `Cancelled` = never funded; `Refunded` = funded but returned to buyer

---
