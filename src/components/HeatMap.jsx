export default function HeatMap({ values = [] }) {
  const defaultValues = Array.from({ length: 24 }, (_, i) => {
    const peak = Math.sin((i - 6) * Math.PI / 12)
    return Math.max(0.05, peak * 0.9)
  })

  const data = values.length === 24 ? values : defaultValues

  const getColor = (v) => {
    const opacity = 0.1 + v * 0.85
    if (v > 0.7) return `rgba(248,113,113,${opacity})`
    if (v > 0.4) return `rgba(245,158,11,${opacity})`
    return `rgba(56,189,248,${opacity})`
  }

  const hours = Array.from({ length: 24 }, (_, i) => {
    if (i === 0) return '12am'
    if (i === 12) return '12pm'
    if (i < 12) return `${i}am`
    return `${i - 12}pm`
  })

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Hourly Usage — EC2
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Today</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-400
                             inline-block" />
            Low
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400
                             inline-block" />
            Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-400
                             inline-block" />
            High
          </span>
        </div>
      </div>

      <div
        className="grid gap-1.5 mb-2"
        style={{ gridTemplateColumns: 'repeat(24, 1fr)' }}
      >
        {data.map((v, i) => (
          <div
            key={i}
            title={`${hours[i]} — ${Math.round(v * 100)}% utilisation`}
            style={{
              aspectRatio: '1',
              borderRadius: '3px',
              background: getColor(v),
              cursor: 'pointer',
              transition: 'transform 0.1s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
        ))}
      </div>

      <div className="flex justify-between mt-2">
        {['12am', '3am', '6am', '9am', '12pm',
          '3pm', '6pm', '9pm', '11pm'].map(label => (
          <span key={label} className="text-xs text-gray-500">
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}