import { afterEach, describe, expect, it } from 'vitest'
import { loadConfig, normalizeDomain } from './config.js'

const savedEnv = { ...process.env }

const requiredEnv = {
  DATABASE_URL: 'postgresql://localhost:5432/shrty',
  SHRTY_API_KEY: 'test-api-key-12345678',
  FEISTEL_KEY: 'test-feistel-key-123456',
}

function loadWithDomain(domain?: string) {
  Object.assign(process.env, requiredEnv)
  if (domain === undefined) {
    delete process.env.SHRTY_DOMAIN
  } else {
    process.env.SHRTY_DOMAIN = domain
  }
  return loadConfig()
}

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in savedEnv)) delete process.env[key]
  }
  Object.assign(process.env, savedEnv)
})

describe('normalizeDomain', () => {
  it('keeps an explicit scheme', () => {
    expect(normalizeDomain('http://localhost:3000')).toBe('http://localhost:3000')
    expect(normalizeDomain('https://shrty.fly.dev')).toBe('https://shrty.fly.dev')
  })

  it('defaults a bare host to https', () => {
    expect(normalizeDomain('shrty.fly.dev')).toBe('https://shrty.fly.dev')
  })

  it('strips trailing slashes', () => {
    expect(normalizeDomain('https://shrty.fly.dev/')).toBe('https://shrty.fly.dev')
    expect(normalizeDomain('http://localhost:3000//')).toBe('http://localhost:3000')
  })
})

describe('loadConfig', () => {
  it('uses the local API base URL by default', () => {
    expect(loadWithDomain(undefined).domain).toBe('http://localhost:3000')
  })

  it('accepts a bare host and normalizes it to https', () => {
    expect(loadWithDomain('shrty.fly.dev').domain).toBe('https://shrty.fly.dev')
  })

  it('accepts a full URL', () => {
    expect(loadWithDomain('http://localhost:3000/').domain).toBe('http://localhost:3000')
  })

  it('rejects an empty domain', () => {
    expect(() => loadWithDomain('')).toThrow()
  })

  it('rejects a domain with a path', () => {
    expect(() => loadWithDomain('https://shrty.fly.dev/foo')).toThrow()
  })
})
