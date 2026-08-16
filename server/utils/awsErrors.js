// server/utils/awsErrors.js
//
// Distinguishes AWS *authentication/credential* failures from AWS *data
// availability* responses (e.g. "no RDS instances in this account",
// "forecast unavailable for this window") — the latter are normal and
// should keep degrading gracefully to empty/zero defaults; the former
// indicate the connected account isn't actually reachable and should
// surface as a real error instead of a silently "successful" empty response.
function isCredentialError(err) {
  if (!err) return false
  const name    = err.name || err.Code || ''
  const message = err.message || ''
  const authNames = [
    'UnrecognizedClientException',
    'InvalidClientTokenId',
    'InvalidSignatureException',
    'AccessDenied',
    'AccessDeniedException',
    'AuthFailure',
    'CredentialsProviderError',
    'ExpiredTokenException',
  ]
  return authNames.includes(name) || /credential/i.test(message)
}

module.exports = { isCredentialError }
