import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Link } from 'react-router-dom';

export function Navbar() {
  return (
    <nav className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 shadow">
      <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">
          🛡️ SafeTrade
        </Link>
        <div className="flex space-x-8 ml-12">
          <Link to="/listings" className="hover:opacity-80">
            Listings
          </Link>
          <Link to="/my-orders" className="hover:opacity-80">
            My Orders
          </Link>
          <Link to="/disputes" className="hover:opacity-80">
            Disputes
          </Link>
        </div>
        <WalletMultiButton />
      </div>
    </nav>
  );
}
