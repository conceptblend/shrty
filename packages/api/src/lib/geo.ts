import geoip from 'geoip-lite'

export function lookupCountry(ip: string): string | null {
  const cleanIp = ip.replace(/^::ffff:/, '')
  const geo = geoip.lookup(cleanIp)
  return geo?.country ?? null
}
