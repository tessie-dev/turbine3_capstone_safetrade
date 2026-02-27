import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { SystemProgram } from '@solana/web3.js';
import BN from 'bn.js';
import { ListingCard } from '../components/ListingCard';
import { useProgram } from '../hooks/useProgram';
import { escrowAccountToListing, findEscrowPda, findVaultPda } from '../utils/escrow';
import type { Listing } from '../types';

export function MyOrdersPage() {
  const { connected } = useWallet();
  const { program, provider } = useProgram();
  const prog: any = program;
  const walletPub = provider?.wallet?.publicKey;

  const [orders, setOrders] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!program || !walletPub) return;
    setLoading(true);
    try {
      const accs: any[] = await prog.account.escrowAccount.all();
      const all = accs.map(({ account }: any) => escrowAccountToListing(account));
      const filtered = all.filter(
        (l) =>
          l.seller.toBase58() === walletPub.toBase58() ||
          l.buyer?.toBase58() === walletPub.toBase58()
      );
      setOrders(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [program, walletPub]);

  const handleComplete = async (listing: Listing) => {
    if (!program || !walletPub) return;
    try {
      const [escrowPda] = await findEscrowPda(program, listing.seller, listing.listingId);
      const [vaultPda, vaultBump] = await findVaultPda(program, escrowPda);
      await program.methods
        .completeEscrow(new BN(listing.listingId), vaultBump)
        .accounts({
          buyer: walletPub,
          seller: listing.seller,
          escrow: escrowPda,
          vault: vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      alert('Escrow completed');
      await refresh();
    } catch (err) {
      console.error(err);
      alert('completion failed');
    }
  };

  const handleCancel = async (listing: Listing) => {
    if (!program || !walletPub) return;
    try {
      const [escrowPda] = await findEscrowPda(program, listing.seller, listing.listingId);
      await program.methods
        .cancelEscrow(new BN(listing.listingId))
        .accounts({
          seller: walletPub,
          escrow: escrowPda,
        })
        .rpc();
      alert('Escrow cancelled');
      await refresh();
    } catch (err) {
      console.error(err);
      alert('cancellation failed');
    }
  };

  const handleRaiseDispute = async (listing: Listing) => {
    if (!program || !walletPub) return;
    try {
      const [escrowPda] = await findEscrowPda(program, listing.seller, listing.listingId);
      await program.methods
        .raiseDispute(new BN(listing.listingId))
        .accounts({
          initiator: walletPub,
          seller: listing.seller,
          escrow: escrowPda,
        })
        .rpc();
      alert('Dispute raised');
      await refresh();
    } catch (err) {
      console.error(err);
      alert('raise dispute failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">📋 My Orders</h1>
        <p className="text-gray-600">View and manage all your transactions</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {!connected ? (
          <p className="text-center text-gray-500">
            Connect your wallet to view your orders
          </p>
        ) : loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="text-center text-gray-500">No orders yet</p>
        ) : (
          <div className="space-y-4">
            {orders.map((listing) => {
              const isSeller = listing.seller.toBase58() === walletPub?.toBase58();
              const isBuyer = listing.buyer?.toBase58() === walletPub?.toBase58();
              return (
                <ListingCard
                  key={listing.listingId}
                  listingId={listing.listingId}
                  seller={listing.seller.toBase58()}
                  amount={listing.amount}
                  status={listing.status}
                  createdAt={listing.createdAt}
                  onComplete={isBuyer && listing.status === 'funded' ? () => handleComplete(listing) : undefined}
                  onCancel={isSeller && listing.status === 'created' ? () => handleCancel(listing) : undefined}
                  onDispute={
                    (isBuyer || isSeller) && listing.status === 'funded'
                      ? () => handleRaiseDispute(listing)
                      : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
