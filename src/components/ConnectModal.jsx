export default function ConnectModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center
                    justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl
                      p-6 w-80 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400
                     hover:text-white text-lg"
        >
          ×
        </button>
        <h2 className="text-white font-semibold mb-4">Connect AWS Account</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Account ID
            </label>
            <input
              className="w-full bg-gray-800 border border-gray-700
                         rounded-lg px-3 py-2 text-sm text-white
                         font-mono focus:outline-none focus:border-blue-500"
              placeholder="123456789012"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Access Key ID
            </label>
            <input
              className="w-full bg-gray-800 border border-gray-700
                         rounded-lg px-3 py-2 text-sm text-white
                         font-mono focus:outline-none focus:border-blue-500"
              placeholder="AKIAIOSFODNN7EXAMPLE"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Secret Access Key
            </label>
            <input
              type="password"
              className="w-full bg-gray-800 border border-gray-700
                         rounded-lg px-3 py-2 text-sm text-white
                         font-mono focus:outline-none focus:border-blue-500"
              placeholder="••••••••••••••••"
            />
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Credentials are sent only to your local backend server.
        </p>

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-800 text-gray-300
                       rounded-lg text-sm hover:bg-gray-700 transition"
          >
            Cancel
          </button>
          <button
            className="flex-1 py-2 bg-blue-500 text-white rounded-lg
                       text-sm font-semibold hover:bg-blue-400 transition"
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  )
}