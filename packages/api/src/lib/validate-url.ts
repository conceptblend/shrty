export function validateDestinationUrl(raw: string): URL | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return null
  }

  if (!url.hostname || url.hostname.length === 0) {
    return null
  }

  if (isPrivateIp(url.hostname)) {
    return null
  }

  return url
}

function isPrivateIp(hostname: string): boolean {
  // Strip brackets from IPv6
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase()

  // localhost
  if (host === 'localhost' || host === '::1' || host === '0.0.0.0') {
    return true
  }

  // IPv4 private ranges
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number)
    if (a === 10) return true                                    // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true            // 172.16.0.0/12
    if (a === 192 && b === 168) return true                      // 192.168.0.0/16
    if (a === 127) return true                                   // 127.0.0.0/8
    if (a === 169 && b === 254) return true                      // 169.254.0.0/16
  }

  // IPv6 private ranges
  if (host.startsWith('fc') || host.startsWith('fd')) return true  // fc00::/7
  if (host.startsWith('fe80')) return true                         // fe80::/10
  if (host.startsWith('::ffff:')) return true                      // mapped v4

  return false
}
