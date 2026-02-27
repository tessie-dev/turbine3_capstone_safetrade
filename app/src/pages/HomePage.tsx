import { Link } from 'react-router-dom';
// styling is handled with Tailwind CSS, no external stylesheet required

export function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-100 via-indigo-200 to-purple-100">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-16">
        <section className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg shadow-lg py-12 text-center space-y-4">
          <h1 className="text-4xl font-extrabold">SafeTrade - Solana Blockchain Escrow</h1>
          <p className="text-lg">
            Secure, transparent, and decentralized transaction protection platform
          </p>
          <div className="space-x-4 mt-4">
            <Link
              to="/listings"
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              Browse Listings
            </Link>
            <Link
              to="/my-orders"
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
            >
              View Orders
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center space-y-2 bg-indigo-50 p-4 rounded">
            <div className="text-3xl">🔒</div>
            <h3 className="font-semibold text-indigo-800">Secure Escrow</h3>
            <p className="text-indigo-600">
              All funds protected by smart contracts, ensuring transaction safety
            </p>
          </div>
          <div className="text-center space-y-2 bg-blue-50 p-4 rounded">
            <div className="text-3xl">⏱️</div>
            <h3 className="font-semibold text-blue-800">Flexible Timeframes</h3>
            <p className="text-blue-600">
              Configurable confirmation and dispute periods for various scenarios
            </p>
          </div>
          <div className="text-center space-y-2 bg-purple-50 p-4 rounded">
            <div className="text-3xl">⚖️</div>
            <h3 className="font-semibold text-purple-800">Dispute Resolution</h3>
            <p className="text-purple-600">
              Decentralized voting mechanism for fair dispute settlement
            </p>
          </div>
          <div className="text-center space-y-2 bg-indigo-100 p-4 rounded">
            <div className="text-3xl">🚀</div>
            <h3 className="font-semibold text-indigo-900">Fast Transactions</h3>
            <p className="text-indigo-600">
              Built on Solana for high-speed, low-cost trading
            </p>
          </div>
        </section>

        <section className="space-y-4 bg-indigo-50 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-center text-indigo-900">Transaction Flow</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="text-center border border-indigo-200 bg-white rounded-lg shadow-sm px-4 py-3 w-full sm:w-56">
              <div className="text-xl font-bold">1</div>
              <h3 className="font-semibold">Seller Creates</h3>
              <p>Seller creates a product listing on blockchain</p>
            </div>
            <div className="text-2xl">→</div>
            <div className="text-center border border-indigo-200 bg-white rounded-lg shadow-sm px-4 py-3 w-full sm:w-56">
              <div className="text-xl font-bold">2</div>
              <h3 className="font-semibold">Buyer Purchases</h3>
              <p>Buyer pays amount, funds escrowed in smart contract</p>
            </div>
            <div className="text-2xl">→</div>
            <div className="text-center border border-indigo-200 bg-white rounded-lg shadow-sm px-4 py-3 w-full sm:w-56">
              <div className="text-xl font-bold">3</div>
              <h3 className="font-semibold">Confirm Delivery</h3>
              <p>Buyer confirms receipt, funds released to seller</p>
            </div>
            <div className="text-2xl">→</div>
            <div className="text-center border border-indigo-200 bg-white rounded-lg shadow-sm px-4 py-3 w-full sm:w-56">
              <div className="text-xl font-bold">4</div>
              <h3 className="font-semibold">Transaction Complete</h3>
              <p>Trade successful, both parties satisfied</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
