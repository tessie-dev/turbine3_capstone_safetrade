import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { ListingsPage } from './pages/ListingsPage';
import { MyOrdersPage } from './pages/MyOrdersPage';
import { DisputesPage } from './pages/DisputesPage';

import '@solana/wallet-adapter-react-ui/styles.css';


declare global {
  interface ImportMetaEnv {
    readonly VITE_SOLANA_RPC?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

function App() {
  // pick RPC via environment variable so we can easily switch between Devnet and Localnet
  const rpcUrl =
    import.meta.env.VITE_SOLANA_RPC ||
    clusterApiUrl(WalletAdapterNetwork.Devnet); // default to devnet if nothing provided

  const endpoint = rpcUrl;

  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Router>
            <div className="app">
              <Navbar />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/listings" element={<ListingsPage />} />
                  <Route path="/my-orders" element={<MyOrdersPage />} />
                  <Route path="/disputes" element={<DisputesPage />} />
                </Routes>
              </main>
              <footer className="footer text-center py-6">
                <p>&copy; 2026 SafeTrade. Built on Solana.</p>
              </footer>
            </div>
          </Router>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
