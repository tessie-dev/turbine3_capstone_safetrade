# SafeTrade Frontend

React frontend for the SafeTrade escrow dApp.

## Project Structure

```text
src/
├── components/
│   ├── Navbar.tsx
│   └── ListingCard.tsx
├── hooks/
│   └── useProgram.ts
├── idl/
│   └── safetrade_capstone.json
├── pages/
│   ├── HomePage.tsx
│   ├── ListingsPage.tsx
│   ├── MyOrdersPage.tsx
│   └── DisputesPage.tsx
├── types/
│   └── index.ts
├── utils/
│   └── escrow.ts
├── App.tsx
└── main.tsx
```

## Pages and Purpose

- `HomePage`
  - Landing page with product overview and transaction flow visualization.
- `ListingsPage`
  - View all escrow listings.
  - Create new listing (seller flow).
  - Fund listing as buyer (`Buy`).
  - `Buy` is disabled for non-buyable states (`funded`, `completed`, `cancelled`, `refunded`).
- `MyOrdersPage`
  - View only orders related to current wallet (as seller or buyer).
  - Buyer action: complete escrow.
  - Seller action: cancel escrow before funding.
  - Buyer or seller action: raise dispute from funded status.
- `DisputesPage`
  - View all escrows currently in dispute.
  - Arbitrator voting actions: vote for buyer or seller.
  - Post-voting action: resolve dispute after dispute window ends.

## Functional Components

- `Navbar`
  - Global navigation and wallet connect button.
- `ListingCard`
  - Shared order/listing card UI used across pages.
  - Renders contextual actions (`Buy`, `Complete`, `Cancel`, `Dispute`) based on props.

## Wallet and Program Integration

- Wallet adapter providers are mounted at app root (`App.tsx`).
- Program client initialization is centralized in `hooks/useProgram.ts`.
- PDA derivation and escrow data mapping helpers are in `utils/escrow.ts`.

## Current Functional Coverage

- Listing creation and funding
- Order completion and cancellation
- Dispute raise / vote / resolve
- State-aware action gating in UI
