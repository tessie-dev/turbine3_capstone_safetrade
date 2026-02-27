import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import BN from 'bn.js';
import { useProgram } from '../hooks/useProgram';
import { enumToStatus, findEscrowPda, findVaultPda, findVoteReceiptPda } from '../utils/escrow';

interface DisputeItem {
  listingId: number;
  seller: string;
  buyer: string;
  amount: number;
  disputeEndTime: number;
  votesForBuyer: number;
  votesForSeller: number;
}

export function DisputesPage() {
  const { connected, publicKey } = useWallet();
  const { program } = useProgram();
  const prog: any = program;
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const now = Math.floor(Date.now() / 1000);

  const refresh = async () => {
    if (!program) return;
    setLoading(true);
    try {
      const accs: any[] = await prog.account.escrowAccount.all();
      const inDispute = accs
        .map(({ account }: any) => account)
        .filter((acc: any) => enumToStatus(acc.status) === 'inDispute')
        .map((acc: any) => ({
          listingId: new BN(acc.listingId).toNumber(),
          seller: acc.seller.toBase58(),
          buyer: acc.buyer.toBase58(),
          amount: new BN(acc.amount).toNumber(),
          disputeEndTime: new BN(acc.disputeEndTime).toNumber(),
          votesForBuyer: new BN(acc.votesForBuyer).toNumber(),
          votesForSeller: new BN(acc.votesForSeller).toNumber(),
        }));

      setDisputes(inDispute);
    } catch (err) {
      console.error('failed to load disputes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [program]);

  const vote = async (item: DisputeItem, supportSeller: boolean) => {
    if (!program || !publicKey) return;
    const actionId = `${item.seller}-${item.listingId}-vote-${supportSeller ? 'seller' : 'buyer'}`;
    try {
      setActing(actionId);
      const seller = new PublicKey(item.seller);
      const [escrowPda] = await findEscrowPda(program, seller, item.listingId);
      const [voteReceiptPda, receiptBump] = await findVoteReceiptPda(program, escrowPda, publicKey);

      await program.methods
        .voteOnDispute(new BN(item.listingId), supportSeller, receiptBump)
        .accounts({
          arbitrator: publicKey,
          seller,
          escrow: escrowPda,
          voteReceipt: voteReceiptPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      alert('Vote submitted');
      await refresh();
    } catch (err) {
      console.error(err);
      alert('vote failed (you may have already voted)');
    } finally {
      setActing(null);
    }
  };

  const resolve = async (item: DisputeItem) => {
    if (!program || !publicKey) return;
    const actionId = `${item.seller}-${item.listingId}-resolve`;
    try {
      setActing(actionId);
      const seller = new PublicKey(item.seller);
      const buyer = new PublicKey(item.buyer);
      const [escrowPda] = await findEscrowPda(program, seller, item.listingId);
      const [vaultPda, vaultBump] = await findVaultPda(program, escrowPda);

      await program.methods
        .resolveDispute(new BN(item.listingId), vaultBump)
        .accounts({
          resolver: publicKey,
          seller,
          buyer,
          escrow: escrowPda,
          vault: vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      alert('Dispute resolved');
      await refresh();
    } catch (err) {
      console.error(err);
      alert('resolve failed');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">⚖️ Dispute Resolution</h1>
        <p className="text-gray-600">Participate in dispute voting and become a fair arbitrator</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {!connected ? (
          <p className="text-center text-gray-500">
            Connect your wallet to participate in arbitration
          </p>
        ) : loading ? (
          <p className="text-center text-gray-500">Loading disputes...</p>
        ) : disputes.length === 0 ? (
          <p className="text-center text-gray-500">No pending disputes</p>
        ) : (
          <div className="space-y-4">
            {disputes.map((item) => {
              const seller = item.seller;
              const buyer = item.buyer;
              const wallet = publicKey?.toBase58();
              const isParty = wallet === seller || wallet === buyer;
              const votingOpen = now < item.disputeEndTime;
              const actionPrefix = `${item.seller}-${item.listingId}`;

              return (
                <div key={actionPrefix} className="border rounded p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Listing #{item.listingId}</h3>
                    <span className="text-sm bg-red-500 text-white px-2 py-1 rounded">inDispute</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                    <p>Seller: {seller.slice(0, 8)}...{seller.slice(-6)}</p>
                    <p>Buyer: {buyer.slice(0, 8)}...{buyer.slice(-6)}</p>
                    <p>Amount: {(item.amount / 1_000_000).toFixed(3)} SOL</p>
                    <p>Vote window end: {new Date(item.disputeEndTime * 1000).toLocaleString()}</p>
                    <p>Votes buyer: {item.votesForBuyer}</p>
                    <p>Votes seller: {item.votesForSeller}</p>
                  </div>

                  {votingOpen && !isParty && (
                    <div className="flex gap-2">
                      <button
                        className="bg-teal-600 text-white px-3 py-1 rounded hover:bg-teal-700 disabled:bg-gray-400"
                        onClick={() => vote(item, false)}
                        disabled={acting === `${actionPrefix}-vote-buyer`}
                      >
                        Vote Buyer
                      </button>
                      <button
                        className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 disabled:bg-gray-400"
                        onClick={() => vote(item, true)}
                        disabled={acting === `${actionPrefix}-vote-seller`}
                      >
                        Vote Seller
                      </button>
                    </div>
                  )}

                  {votingOpen && isParty && (
                    <p className="text-sm text-gray-500">Buyer/Seller cannot vote on this dispute.</p>
                  )}

                  {!votingOpen && (
                    <button
                      className="bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-700 disabled:bg-gray-400"
                      onClick={() => resolve(item)}
                      disabled={acting === `${actionPrefix}-resolve`}
                    >
                      Resolve Dispute
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
