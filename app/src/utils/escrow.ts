import { PublicKey } from '@solana/web3.js';
import { EscrowStatus, Listing } from '../types';
import BN from 'bn.js';

// Anchor serializes enums as numbers starting from 0; the order matches the Rust
// declaration in states/mod.rs (Created, Funded, InDispute, Completed,
// Cancelled, Refunded).
export function enumToStatus(v: unknown): EscrowStatus {
  if (typeof v === 'number') {
    switch (v) {
      case 0:
        return 'created';
      case 1:
        return 'funded';
      case 2:
        return 'inDispute';
      case 3:
        return 'completed';
      case 4:
        return 'cancelled';
      case 5:
        return 'refunded';
      default:
        return 'created';
    }
  }

  if (v && typeof v === 'object') {
    const key = Object.keys(v as Record<string, unknown>)[0];
    switch (key) {
      case 'created':
        return 'created';
      case 'funded':
        return 'funded';
      case 'inDispute':
        return 'inDispute';
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      case 'refunded':
        return 'refunded';
      default:
        return 'created';
    }
  }

  switch (v) {
    default:
      return 'created';
  }
}

// helper that mimics the testing utility in safetrade_capstone.ts
export function u64ToLeBuffer(n: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(n));
  return buf;
}

// find escrow PDA given seller and listingId
import type { Program } from '@coral-xyz/anchor';
export async function findEscrowPda(
  program: Program,
  seller: PublicKey,
  listingId: number
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress(
    [Buffer.from('escrow'), seller.toBuffer(), u64ToLeBuffer(listingId)],
    program.programId
  );
}

export async function findVaultPda(
  program: Program,
  escrow: PublicKey
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress(
    [Buffer.from('vault'), escrow.toBuffer()],
    program.programId
  );
}

export async function findVoteReceiptPda(
  program: Program,
  escrow: PublicKey,
  arbitrator: PublicKey
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress(
    [Buffer.from('vote_receipt'), escrow.toBuffer(), arbitrator.toBuffer()],
    program.programId
  );
}

export function escrowAccountToListing(acc: any): Listing {
  // the anchor account object has the same field names defined in Rust
  return {
    listingId: new BN(acc.listingId).toNumber(),
    seller: acc.seller as PublicKey,
    buyer: acc.buyer as PublicKey,
    amount: new BN(acc.amount).toNumber(),
    status: enumToStatus(acc.status),
    createdAt: new BN(acc.createdAt).toNumber(),
    expireAt: new BN(acc.expireAt).toNumber(),
  };
}
