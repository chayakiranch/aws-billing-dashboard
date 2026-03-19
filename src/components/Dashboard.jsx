if (error) {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="text-center max-w-md px-6">
        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center
                        justify-center mx-auto mb-4">
          <span className="text-red-400 text-xl">!</span>
        </div>
        <p className="text-white font-semibold text-lg mb-2">
          Connection Error
        </p>
        <p className="text-gray-400 text-sm mb-3">{error}</p>

        <div className="bg-gray-900 border border-gray-700 rounded-lg
                        p-4 mb-4 text-left">
          <p className="text-xs text-gray-400 font-medium mb-2">
            Common causes:
          </p>
          <ul className="text-xs text-gray-500 space-y-1.5">
            <li>• Wrong Access Key ID or Secret Key — re-check your CSV</li>
            <li>• IAM user missing ce:GetCostAndUsage permission</li>
            <li>• Cost Explorer not enabled in AWS Billing console</li>
            <li>• Keys belong to a different AWS account</li>
          </ul>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg
                     text-white text-sm font-semibold transition"
        >
          Try Different Credentials
        </button>

        {showModal && (
          <ConnectModal
            onClose={() => setShowModal(false)}
            onConnect={handleConnect}
          />
        )}
      </div>
    </div>
  )
}