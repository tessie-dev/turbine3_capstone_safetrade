import { PublicKey } from '@solana/web3.js';

export interface EscrowAccount {
  seller: PublicKey;
  buyer: PublicKey;
  amount: number;
  status: EscrowStatus;
  createdAt: number;
  expireAt: number;
  confirmDuration: number;
  disputeDuration: number;
  disputeInitiator: PublicKey;
  disputeEndTime: number;
  votesForBuyer: number;
  votesForSeller: number;
  bump: number;
  listingId: number;
}

export type EscrowStatus = 
  | 'created'
  | 'funded'
  | 'inDispute'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export interface Listing {
  listingId: number;
  seller: PublicKey;
  buyer?: PublicKey;
  amount: number;
  status: EscrowStatus;
  createdAt: number;
  expireAt: number;
}
