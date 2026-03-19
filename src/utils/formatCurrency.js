export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)

export const formatShort = (amount) => {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`
  return `$${Number(amount).toFixed(2)}`
}

export const parseAmount = (resultsByTime) => {
  if (!resultsByTime || !resultsByTime.length) return 0
  return resultsByTime.reduce((sum, period) => {
    const total = period.Groups?.reduce((s, g) =>
      s + parseFloat(g.Metrics.UnblendedCost.Amount), 0) || 0
    return sum + total
  }, 0)
}