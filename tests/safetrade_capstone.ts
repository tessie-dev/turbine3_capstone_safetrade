import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { SafetradeCapstone } from "../target/types/safetrade_capstone";

describe("safetrade_capstone", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.safetradeCapstone as Program<SafetradeCapstone>;
  const connection = provider.connection;
  const seller = provider.wallet.publicKey;
  const buyer = anchor.web3.Keypair.generate();
  const arb1 = anchor.web3.Keypair.generate();
  const arb2 = anchor.web3.Keypair.generate();

  let listingCounter = Math.floor(Date.now() / 1000);

  const LAMPORTS = 1_000_000; // 0.001 SOL
  const CONFIRM_DURATION = 2; // 2 seconds for fast testing
  const DISPUTE_DURATION = 2; // 2 seconds for fast testing

  const newListingId = () => new anchor.BN(listingCounter++);

  const u64ToLeBuffer = (n: number) => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(n));
    return buf;
  };

  const findEscrowPda = (listingId: anchor.BN) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        seller.toBuffer(),
        u64ToLeBuffer(Number(listingId)),
      ],
      program.programId
    );

  const findVaultPda = (escrow: anchor.web3.PublicKey) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrow.toBuffer()],
      program.programId
    );

  const findVoteReceiptPda = (
    escrow: anchor.web3.PublicKey,
    arbitrator: anchor.web3.PublicKey
  ) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("vote_receipt"),
        escrow.toBuffer(),
        arbitrator.toBuffer(),
      ],
      program.programId
    );

  const fundFromSeller = async (pubkey: anchor.web3.PublicKey, sol: number) => {
    const tx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: seller,
        toPubkey: pubkey,
        lamports: Math.floor(sol * anchor.web3.LAMPORTS_PER_SOL),
      })
    );
    await provider.sendAndConfirm(tx, []);
  };

  const ensureBalance = async (
    pubkey: anchor.web3.PublicKey,
    minSol: number,
    topUpSol: number
  ) => {
    const minLamports = Math.floor(minSol * anchor.web3.LAMPORTS_PER_SOL);
    const balance = await connection.getBalance(pubkey, "confirmed");
    if (balance >= minLamports) return;
    await fundFromSeller(pubkey, topUpSol);
  };

  const warpToSlot = async (slot: number) => {
    const anyConn = connection as unknown as { _rpcRequest?: Function; rpcRequest?: Function };
    const warp = anyConn._rpcRequest || anyConn.rpcRequest;
    if (!warp) {
      throw new Error("warpSlot RPC not available on this connection");
    }
    await warp.call(connection, "warpSlot", [slot]);
  };


  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const waitUntilUnix = async (targetUnix: number, timeoutMs = 30000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const slot = await connection.getSlot("confirmed");
      const now = await connection.getBlockTime(slot);
      if (now !== null && now >= targetUnix) return;
      await sleep(500);
    }
    throw new Error(`Timed out waiting for unix time >= ${targetUnix}`);
  };

  before(async () => {
    await ensureBalance(buyer.publicKey, 0.2, 1);
    await ensureBalance(arb1.publicKey, 0.05, 0.2);
    await ensureBalance(arb2.publicKey, 0.05, 0.2);
  });


  it("creates an escrow", async () => {
    const listingId = newListingId();
    const [escrow, escrowBump] = findEscrowPda(listingId);
    const [vault] = findVaultPda(escrow);

    await program.methods
      .createEscrow(listingId, new anchor.BN(LAMPORTS), new anchor.BN(CONFIRM_DURATION), new anchor.BN(DISPUTE_DURATION), escrowBump)
      .accountsPartial({
        seller,
        escrow,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const account = await program.account.escrowAccount.fetch(escrow);
    expect(account.status).to.have.property("created");
    expect(account.amount.toNumber()).to.equal(LAMPORTS);
    expect(account.expireAt.toNumber()).to.equal(0);
  });

  it("funds escrow and sets expire_at", async () => {
    const listingId = newListingId();
    const [escrow, escrowBump] = findEscrowPda(listingId);
    const [vault] = findVaultPda(escrow);

    await program.methods
      .createEscrow(listingId, new anchor.BN(LAMPORTS), new anchor.BN(CONFIRM_DURATION), new anchor.BN(DISPUTE_DURATION), escrowBump)
      .accountsPartial({
        seller,
        escrow,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .fundEscrow(listingId)
      .accountsPartial({
        buyer: buyer.publicKey,
        seller,
        escrow,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const account = await program.account.escrowAccount.fetch(escrow);
    expect(account.status).to.have.property("funded");
    expect(account.buyer.toBase58()).to.equal(buyer.publicKey.toBase58());
    expect(account.expireAt.toNumber()).to.be.greaterThan(0);

    const vaultBalance = await connection.getBalance(vault);
    expect(vaultBalance).to.be.greaterThan(LAMPORTS); // includes rent
  });

  it("completes escrow within window", async () => {
    const listingId = newListingId();
    const [escrow, escrowBump] = findEscrowPda(listingId);
    const [vault, vaultBump] = findVaultPda(escrow);

    await program.methods
      .createEscrow(listingId, new anchor.BN(LAMPORTS), new anchor.BN(CONFIRM_DURATION), new anchor.BN(DISPUTE_DURATION), escrowBump)
      .accountsPartial({
        seller,
        escrow,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .fundEscrow(listingId)
      .accountsPartial({
        buyer: buyer.publicKey,
        seller,
        escrow,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();
    
    const vaultBeforeComplete = await connection.getBalance(vault);
    const sellerBefore = await connection.getBalance(seller);

    await program.methods
      .completeEscrow(listingId, vaultBump)
      .accountsPartial({
        buyer: buyer.publicKey,
        seller,
        escrow,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const account = await program.account.escrowAccount.fetch(escrow);
    expect(account.status).to.have.property("completed");
    const vaultAfterComplete = await connection.getBalance(vault);
    expect(vaultAfterComplete).to.be.lessThan(vaultBeforeComplete);
    expect(vaultBeforeComplete - vaultAfterComplete).to.be.closeTo(LAMPORTS, 15000); // ~LAMPORTS transferred out, account for fees

    const sellerAfter = await connection.getBalance(seller);
    expect(sellerAfter - sellerBefore).to.be.closeTo(LAMPORTS, 15000);
  });

  it("cancels before funding", async () => {
    const listingId = newListingId();
    const [escrow, escrowBump] = findEscrowPda(listingId);
    const [vault] = findVaultPda(escrow);

    await program.methods
      .createEscrow(listingId, new anchor.BN(LAMPORTS), new anchor.BN(CONFIRM_DURATION), new anchor.BN(DISPUTE_DURATION), escrowBump)
      .accountsPartial({
        seller,
        escrow,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .cancelEscrow(listingId)
      .accountsPartial({ seller, escrow })
      .rpc();

    const account = await program.account.escrowAccount.fetch(escrow);
    expect(account.status).to.have.property("cancelled");
  });

  it("resolves dispute in favor of buyer", async () => {
    const listingId = newListingId();
    const [escrow, escrowBump] = findEscrowPda(listingId);
    const [vault, vaultBump] = findVaultPda(escrow);

    await program.methods
      .createEscrow(listingId, new anchor.BN(LAMPORTS), new anchor.BN(CONFIRM_DURATION), new anchor.BN(DISPUTE_DURATION), escrowBump)
      .accountsPartial({
        seller,
        escrow,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .fundEscrow(listingId)
      .accountsPartial({
        buyer: buyer.publicKey,
        seller,
        escrow,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();
    
    const buyerBefore = await connection.getBalance(buyer.publicKey);

    await program.methods
      .raiseDispute(listingId)
      .accountsPartial({
        initiator: buyer.publicKey,
        seller,
        escrow,
      })
      .signers([buyer])
      .rpc();

    const [receipt1, receiptBump1] = findVoteReceiptPda(escrow, arb1.publicKey);
    const [receipt2, receiptBump2] = findVoteReceiptPda(escrow, arb2.publicKey);

    await program.methods
      .voteOnDispute(listingId, false, receiptBump1)
      .accountsPartial({
        arbitrator: arb1.publicKey,
        seller,
        escrow,
        voteReceipt: receipt1,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([arb1])
      .rpc();

    await program.methods
      .voteOnDispute(listingId, false, receiptBump2)
      .accountsPartial({
        arbitrator: arb2.publicKey,
        seller,
        escrow,
        voteReceipt: receipt2,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([arb2])
      .rpc();

    const disputeAccount = await program.account.escrowAccount.fetch(escrow);
    await waitUntilUnix(disputeAccount.disputeEndTime.toNumber() + 1);

    await program.methods
      .resolveDispute(listingId, vaultBump)
      .accountsPartial({
        resolver: buyer.publicKey,
        seller,
        buyer: buyer.publicKey,
        escrow,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const account = await program.account.escrowAccount.fetch(escrow);
    expect(account.status).to.have.property("refunded");

    const vaultBalance = await connection.getBalance(vault);
    expect(vaultBalance).to.be.lessThan(1000000); // rent remains, lamports transferred out

    const buyerAfter = await connection.getBalance(buyer.publicKey);
    expect(buyerAfter - buyerBefore).to.be.closeTo(LAMPORTS, 50000); // refunded ~LAMPORTS
  });

  it("claims after expire for seller", async () => {
    const listingId = newListingId();
    const [escrow, escrowBump] = findEscrowPda(listingId);
    const [vault, vaultBump] = findVaultPda(escrow);

    await program.methods
      .createEscrow(listingId, new anchor.BN(LAMPORTS), new anchor.BN(CONFIRM_DURATION), new anchor.BN(DISPUTE_DURATION), escrowBump)
      .accountsPartial({
        seller,
        escrow,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .fundEscrow(listingId)
      .accountsPartial({
        buyer: buyer.publicKey,
        seller,
        escrow,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const fundedAccount = await program.account.escrowAccount.fetch(escrow);
    await waitUntilUnix(fundedAccount.expireAt.toNumber() + 1);

    const sellerBefore = await connection.getBalance(seller);

    await program.methods
      .claimAfterExpire(listingId, vaultBump)
      .accountsPartial({
        claimer: buyer.publicKey,
        seller,
        escrow,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const account = await program.account.escrowAccount.fetch(escrow);
    expect(account.status).to.have.property("completed");

    const vaultBalance = await connection.getBalance(vault);
    expect(vaultBalance).to.be.lessThan(1000000); // rent remains, lamports transferred out

    const sellerAfter = await connection.getBalance(seller);
    expect(sellerAfter - sellerBefore).to.be.closeTo(LAMPORTS, 10000); // claimed ~LAMPORTS
  });
});
