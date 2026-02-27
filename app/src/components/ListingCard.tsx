interface ListingCardProps {
  listingId: number;
  seller: string;
  amount: number;
  status: string;
  createdAt: number;
  onBuy?: () => void;
  buyDisabled?: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
  onDispute?: () => void;
}

export function ListingCard({
  listingId,
  seller,
  amount,
  status,
  createdAt,
  onBuy,
  buyDisabled = false,
  onComplete,
  onCancel,
  onDispute,
}: ListingCardProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      created: '#ffc107',
      funded: '#17a2b8',
      inDispute: '#dc3545',
      completed: '#28a745',
      cancelled: '#6c757d',
      refunded: '#20c997',
    };
    return colors[status] || '#999';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Listing #{listingId}</h3>
        <span
          className="text-sm font-medium text-white px-2 py-1 rounded"
          style={{ backgroundColor: getStatusColor(status) }}
        >
          {status}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Seller:</span>
          <span className="font-mono">
            {seller.slice(0, 8)}...{seller.slice(-6)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Amount:</span>
          <span className="font-semibold">{(amount / 1_000_000).toFixed(3)} SOL</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Created:</span>
          <span>{formatDate(createdAt)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {onBuy && (
          <button
            className={`text-white px-3 py-1 rounded ${
              buyDisabled
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
            onClick={onBuy}
            disabled={buyDisabled}
          >
            Buy
          </button>
        )}
        {onComplete && (
          <button
            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
            onClick={onComplete}
          >
            Confirm/Complete
          </button>
        )}
        {onCancel && (
          <button
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        {onDispute && (
          <button
            className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
            onClick={onDispute}
          >
            Dispute
          </button>
        )}
      </div>
    </div>
  );
}
