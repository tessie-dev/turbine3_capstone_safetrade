import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { useMemo } from 'react';

declare global {
  interface ImportMetaEnv {
    VITE_PROGRAM_ID?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export interface ProgramContext {
  program: Program<any> | null;
  provider: AnchorProvider | null;
  connection: any;
}
import safetradeCapstoneIDL from '../idl/safetrade_capstone.json';

const programIdString =
  import.meta.env.VITE_PROGRAM_ID || '2mbuH8RZ99bkBZozkvj5AzadS6jsC1BS13m3NjSnqY9r';
export const PROGRAM_ID = new PublicKey(programIdString);

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet, {
      preflightCommitment: 'processed',
    });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    try {
      // Anchor 0.32 uses constructor signature: new Program(idl, provider).
      // Force IDL address to follow env/program constant to avoid mismatch.
      const idlWithAddress = {
        ...safetradeCapstoneIDL,
        address: PROGRAM_ID.toBase58(),
      };
      console.log('Creating Program with IDL:', idlWithAddress);
      console.log('Program ID:', PROGRAM_ID.toBase58());
      const prog = new Program(idlWithAddress as any, provider);
      console.log('Program created successfully');
      return prog;
    } catch (err) {
      console.error('Failed to create Program:', err);
      return null;
    }
  }, [provider]);

  return { program, provider, connection };
}
