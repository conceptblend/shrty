import UAParser from 'ua-parser-js'

export function parseUserAgent(ua: string | null): {
  deviceType: string | null
  browser: string | null
  os: string | null
} {
  if (!ua) {
    return { deviceType: null, browser: null, os: null }
  }

  const parser = new UAParser(ua)
  const result = parser.getResult()

  return {
    deviceType: result.device.type || 'desktop',
    browser: result.browser.name || null,
    os: result.os.name || null,
  }
}
