# SafeTrade Capstone

🧭 System Logic Flows: [View on Whimsical](https://whimsical.com/safetrade-2GG96ARfmPrQiZ6uxhM2TQ)


## Overview

SafeTrade is designed to make second-hand trading safer and more predictable.
Instead of relying on trust alone, payment release and dispute outcomes are enforced by on-chain rules.

In practice, the workflow is straightforward:
- **Seller lists an item**, and a trade order is created on-chain.
- **Buyer pays into escrow**, so funds are protected instead of going directly to the seller.
- **Buyer confirms receipt** to release funds, or the seller can claim after the confirmation window expires.
- **If there is a disagreement**, buyer or seller can open a dispute, arbitrators vote, and the contract settles to seller (`Completed`) or buyer (`Refunded`).

In short, the platform focuses on two core values:
1. **Safety**: escrow-based custody and rule-based settlement on-chain
2. **Dispute support**: built-in arbitration flow with one-person-one-vote receipts


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
Funded       // Buyer paid, confirmation countdown started
InDispute    // Dispute raised, voting in progress
Completed    // Funds released to seller (trade successful)
Cancelled    // Order cancelled before funding (never paid)
Refunded     // Funds returned to buyer after payment (dispute/error)
```

### Key Assumption: Funded = Seller Fulfillment Begins

**When a buyer calls `fund_escrow` and the status changes to `Funded`:**
- **Assumption**: The seller will immediately see the payment and begin fulfillment (shipping goods, providing service, etc.)
- **Simplified Model**: We do NOT track "seller shipped" as a separate on-chain state to keep the program simple
- **Consequence**: The confirmation timer starts from funding (duration is configurable), not from a hypothetical "shipment confirmation"

This design trusts that sellers will act in good faith once funds are escrowed. If the seller never ships, the buyer can:
1. Raise a dispute before expiration
2. Provide evidence to arbitrators
3. Get a refund via `resolve_dispute` if arbitrators vote in their favor

---

## Business Flows

### 1. Normal Completion Flow
```
Created (seller creates order)
  ↓ fund_escrow (buyer pays, expire_at = now + confirm_duration)
Funded (seller sees payment, begins shipping)
  ↓ complete_escrow (buyer confirms receipt within confirmation window)
Completed (funds → seller)
```

### 2. Expiration Auto-Payout
```
Created
  ↓ fund_escrow
Funded (confirmation timer starts, seller ships)
  ↓ (buyer doesn't confirm before expiration)
  ↓ claim_after_expire (anyone can trigger)
Completed (funds → seller)
```

### 3. Dispute Resolution
```
Created
  ↓ fund_escrow
Funded
  ↓ raise_dispute (buyer or seller initiates, dispute_duration voting window)
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
        │ _escrow │  dispute│  (after confirm_duration)
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

## Devnet Deployment Info

- Cluster: `https://api.devnet.solana.com`
- Program ID: `2mbuH8RZ99bkBZozkvj5AzadS6jsC1BS13m3NjSnqY9r`
- Deploy signature: `f13tvLQ1TB62NfEoJXPHzNJR4mN6RXxin3sqGqxzcnEWvjYzDXp4t6Jzc1Y2M3NPxKcHuBNVAvQkfAsqAE62HNo`
- IDL account: `339FboZdZc3QadeTTd9aAEk4Xtx91gDUgGthgg5U1stQ`

Frontend `.env` (for devnet):

```env
VITE_PROGRAM_ID=2mbuH8RZ99bkBZozkvj5AzadS6jsC1BS13m3NjSnqY9r
VITE_SOLANA_RPC=https://api.devnet.solana.com
```
