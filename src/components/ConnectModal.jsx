import { useState } from 'react'

function Tooltip({ text }) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative inline-block ml-1.5">
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="inline-flex items-center justify-center w-4 h-4
                   rounded-full bg-gray-700 text-gray-300 text-xs
                   cursor-help hover:bg-blue-600 hover:text-white transition"
      >
        ?
      </span>
      {visible && (
        <div className="absolute left-6 top-0 z-50 w-72 bg-gray-800
                        border border-gray-600 rounded-lg p-3 shadow-xl">
          <p className="text-xs text-gray-300 leading-relaxed">{text}</p>
        </div>
      )}
    </span>
  )
}

const TOOLTIPS = {
  accountId: `Your 12-digit AWS Account ID. To find it: Log in to the AWS Console → click your account name in the top-right corner → your Account ID is shown at the top of the dropdown menu.`,

  accessKeyId: `A 20-character key that identifies your IAM user. To get it: AWS Console → IAM → Users → select your user → Security credentials tab → Create access key → choose "Application running outside AWS" → copy the Access Key ID shown.`,

  secretAccessKey: `A 40-character secret paired with your Access Key ID. You can only view it once when creating the key. To get it: AWS Console → IAM → Users → your user → Security credentials → Create access key → download the CSV file. If you lost it, create a new access key.`,

  region: `The AWS region where your Cost Explorer is configured. Cost Explorer data is global but the API endpoint is always us-east-1. Leave this as us-east-1 unless you have a specific reason to change it.`
}

export default function ConnectModal({ onClose, onConnect }) {
  const [form, setForm] = useState({
    accountId: '',
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSecret, setShowSecret] = useState(false)

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setError('')
  }

  const handleConnect = async () => {
    if (!form.accessKeyId.trim()) {
      setError('Access Key ID is required')
      return
    }
    if (!form.secretAccessKey.trim()) {
      setError('Secret Access Key is required')
      return
    }
    if (!form.accessKeyId.startsWith('AKIA')) {
      setError('Access Key ID should start with AKIA')
      return
    }
    if (form.secretAccessKey.length < 30) {
      setError('Secret Access Key looks too short — check it again')
      return
    }
    setLoading(true)
    setError('')
    try {
      const API_BASE = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${API_BASE}/api/health`)
      if (!res.ok) throw new Error('Cannot reach backend server')
      onConnect(form)
    } catch (err) {
      setError('Cannot reach the backend server. Make sure it is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center
                    justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl
                      p-6 w-full max-w-md relative shadow-2xl">

        {/* Header */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400
                     hover:text-white text-xl leading-none"
        >
          ×
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center
                          justify-center text-white font-bold text-xs">
            AWS
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">
              Connect AWS Account
            </h2>
            <p className="text-gray-400 text-xs">
              Enter your credentials to load billing data
            </p>
          </div>
        </div>

        {/* Account ID */}
        <div className="mb-4">
          <label className="flex items-center text-xs text-gray-400 mb-1.5">
            Account ID
            <Tooltip text={TOOLTIPS.accountId} />
            <span className="ml-auto text-gray-600 text-xs">Optional</span>
          </label>
          <input
            className="w-full bg-gray-800 border border-gray-700 rounded-lg
                       px-3 py-2.5 text-sm text-white font-mono
                       focus:outline-none focus:border-blue-500 transition
                       placeholder-gray-600"
            placeholder="123456789012"
            value={form.accountId}
            onChange={handleChange('accountId')}
            maxLength={12}
          />
          <p className="text-xs text-gray-600 mt-1">
            12-digit number shown in your AWS console top-right menu
          </p>
        </div>

        {/* Access Key ID */}
        <div className="mb-4">
          <label className="flex items-center text-xs text-gray-400 mb-1.5">
            Access Key ID
            <Tooltip text={TOOLTIPS.accessKeyId} />
            <span className="ml-auto text-red-400 text-xs">Required</span>
          </label>
          <input
            className="w-full bg-gray-800 border border-gray-700 rounded-lg
                       px-3 py-2.5 text-sm text-white font-mono
                       focus:outline-none focus:border-blue-500 transition
                       placeholder-gray-600"
            placeholder="AKIAIOSFODNN7EXAMPLE"
            value={form.accessKeyId}
            onChange={handleChange('accessKeyId')}
          />
          <p className="text-xs text-gray-600 mt-1">
            Starts with AKIA — found in IAM → Users → Security credentials
          </p>
        </div>

        {/* Secret Access Key */}
        <div className="mb-4">
          <label className="flex items-center text-xs text-gray-400 mb-1.5">
            Secret Access Key
            <Tooltip text={TOOLTIPS.secretAccessKey} />
            <span className="ml-auto text-red-400 text-xs">Required</span>
          </label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg
                         px-3 py-2.5 pr-16 text-sm text-white font-mono
                         focus:outline-none focus:border-blue-500 transition
                         placeholder-gray-600"
              placeholder="wJalrXUtnFEMI/K7MDENG..."
              value={form.secretAccessKey}
              onChange={handleChange('secretAccessKey')}
            />
            <button
              type="button"
              onClick={() => setShowSecret(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2
                         text-xs text-gray-400 hover:text-white transition"
            >
              {showSecret ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            40 characters — only visible once when created. Check your CSV file.
          </p>
        </div>

        {/* Region */}
        <div className="mb-5">
          <label className="flex items-center text-xs text-gray-400 mb-1.5">
            Region
            <Tooltip text={TOOLTIPS.region} />
          </label>
          <select
            className="w-full bg-gray-800 border border-gray-700 rounded-lg
                       px-3 py-2.5 text-sm text-white
                       focus:outline-none focus:border-blue-500 transition
                       cursor-pointer"
            value={form.region}
            onChange={handleChange('region')}
          >
            <option value="us-east-1">us-east-1 (N. Virginia) — recommended</option>
            <option value="us-west-2">us-west-2 (Oregon)</option>
            <option value="eu-west-1">eu-west-1 (Ireland)</option>
            <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
            <option value="ap-south-1">ap-south-1 (Mumbai)</option>
          </select>
        </div>

        {/* How to get credentials guide */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg
                        p-3 mb-4">
          <p className="text-xs text-gray-400 font-medium mb-2">
            How to get your credentials:
          </p>
          <ol className="text-xs text-gray-500 space-y-1 list-decimal
                         list-inside leading-relaxed">
            <li>Log in to console.aws.amazon.com</li>
            <li>Search for IAM → Users → your user</li>
            <li>Click Security credentials tab</li>
            <li>Click Create access key</li>
            <li>Select "Application running outside AWS"</li>
            <li>Copy or download the CSV with both keys</li>
          </ol>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg
                          px-3 py-2 mb-4">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        {/* Security note */}
        <p className="text-xs text-gray-600 mb-4 text-center">
          Credentials are sent only to your backend server and never stored
          in the browser or shared with third parties.
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-800 text-gray-300 border
                       border-gray-700 rounded-lg text-sm
                       hover:bg-gray-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg
                       text-sm font-semibold hover:bg-blue-400 transition
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connecting...' : 'Connect & Load Data'}
          </button>
        </div>
      </div>
    </div>
  )
}