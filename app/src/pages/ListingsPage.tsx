import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import BN from 'bn.js';
import { ListingCard } from '../components/ListingCard';
import { useProgram } from '../hooks/useProgram';
import { escrowAccountToListing, findEscrowPda, findVaultPda } from '../utils/escrow';
import type { Listing } from '../types';


export function ListingsPage() {
  const { connected } = useWallet();
  const { program, provider } = useProgram();
  const prog: any = program; 
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);

  // state for new listing form
  const [newAmount, setNewAmount] = useState('');
  const [newConfirm, setNewConfirm] = useState('');
  const [newDispute, setNewDispute] = useState('');

  useEffect(() => {
    if (!program) return;

    setLoading(true);
    // fetch all escrow accounts and convert them to Listing
    prog.account.escrowAccount
      .all()
      .then((accs: any[]) => {
        setListings(accs.map(({ account }: any) => escrowAccountToListing(account)));
      })
      .catch((err: any) => {
        console.error('failed to load listings', err);
      })
      .finally(() => setLoading(false));
  }, [program]);

  const createListing = async () => {
    if (!program || !provider?.wallet?.publicKey) {
      alert('Wallet/program not ready');
      return;
    }

    const sellerPub = provider.wallet.publicKey;
    // determine next listing id for this seller
    const sellerListings = listings.filter(
      (l) => l.seller.toBase58() === sellerPub.toBase58()
    );
    const nextId = sellerListings.reduce((m, l) => Math.max(m, l.listingId), 0) + 1;

    try {
      const lamports = parseInt(newAmount, 10);
      const confirm = parseInt(newConfirm, 10);
      const dispute = parseInt(newDispute, 10);
      const [escrowPda, bump] = await findEscrowPda(program, sellerPub, nextId);

      await program.methods
        .createEscrow(new BN(nextId), new BN(lamports), new BN(confirm), new BN(dispute), bump)
        .accounts({
          seller: sellerPub,
          escrow: escrowPda,
          vault: (await PublicKey.findProgramAddress(
            [Buffer.from('vault'), escrowPda.toBuffer()],
            program.programId
          ))[0],
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      alert('Listing created');
      // refresh listings
      if (program) {
        const accs: any[] = await prog.account.escrowAccount.all();
        setListings(accs.map(({ account }: any) => escrowAccountToListing(account)));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create listing');
    }
  };

  const isBuyTerminalStatus = (status: Listing['status']) =>
    status === 'funded' ||
    status === 'completed' ||
    status === 'cancelled' ||
    status === 'refunded';

  const handleBuy = async (listing: Listing) => {
    if (isBuyTerminalStatus(listing.status)) {
      return;
    }

    if (!connected) {
      alert('Please connect your wallet first');
      return;
    }
    if (!program || !program.provider.wallet?.publicKey) {
      alert('Program not initialized');
      return;
    }

    try {
      // compute escrow PDA the same way as in tests
      const [escrowPda] = await findEscrowPda(program, listing.seller, listing.listingId);
      const [vaultPda] = await findVaultPda(program, escrowPda);

      await program.methods
        .fundEscrow(new BN(listing.listingId))
        .accounts({
          buyer: program.provider.wallet.publicKey,
          seller: listing.seller,
          escrow: escrowPda,
          vault: vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      alert('Funded successfully');
      const accs: any[] = await prog.account.escrowAccount.all();
      setListings(accs.map(({ account }: any) => escrowAccountToListing(account)));
    } catch (err) {
      console.error(err);
      alert('Error funding escrow');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">📦 Product Listings</h1>
        <p className="text-gray-600">Browse all available products for purchase</p>
      </div>

      {connected && (
        <div className="bg-white p-4 rounded shadow space-y-2">
          <h2 className="font-semibold">Create a new listing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="Amount (lamports)"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="border p-1 rounded"
            />
            <input
              type="number"
              placeholder="Confirm duration (s)"
              value={newConfirm}
              onChange={(e) => setNewConfirm(e.target.value)}
              className="border p-1 rounded"
            />
            <input
              type="number"
              placeholder="Dispute duration (s)"
              value={newDispute}
              onChange={(e) => setNewDispute(e.target.value)}
              className="border p-1 rounded"
            />
          </div>
          <button
            onClick={createListing}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Create
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-500">Loading listings…</p>
      ) : listings.length === 0 ? (
        <p className="text-center text-gray-500">No listings available</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard
              key={listing.listingId}
              listingId={listing.listingId}
              seller={listing.seller.toBase58()}
              amount={listing.amount}
              status={listing.status}
              createdAt={listing.createdAt}
              onBuy={() => handleBuy(listing)}
              buyDisabled={isBuyTerminalStatus(listing.status)}
            />
          ))}
        </div>
      )}

      {!connected && (
        <p className="text-center text-gray-500 mt-6">
          💡 Connect wallet to make purchases
        </p>
      )}
    </div>
  );
}
