import { describe, it, expect } from 'vitest'
import { validateDestinationUrl } from '../lib/validate-url'

describe('validateDestinationUrl', () => {
  it('accepts valid http URLs', () => {
    const url = validateDestinationUrl('http://example.com')
    expect(url).not.toBeNull()
    expect(url!.href).toBe('http://example.com/')
  })

  it('accepts valid https URLs', () => {
    const url = validateDestinationUrl('https://example.com/path?q=1')
    expect(url).not.toBeNull()
    expect(url!.href).toBe('https://example.com/path?q=1')
  })

  it('rejects javascript: protocol', () => {
    expect(validateDestinationUrl('javascript:alert(1)')).toBeNull()
  })

  it('rejects data: protocol', () => {
    expect(validateDestinationUrl('data:text/html,<h1>hi</h1>')).toBeNull()
  })

  it('rejects file: protocol', () => {
    expect(validateDestinationUrl('file:///etc/passwd')).toBeNull()
  })

  it('rejects ftp: protocol', () => {
    expect(validateDestinationUrl('ftp://example.com/file')).toBeNull()
  })

  it('rejects localhost', () => {
    expect(validateDestinationUrl('http://localhost:3000/api')).toBeNull()
  })

  it('rejects 127.0.0.1', () => {
    expect(validateDestinationUrl('http://127.0.0.1/secret')).toBeNull()
  })

  it('rejects 10.x.x.x private IPs', () => {
    expect(validateDestinationUrl('http://10.0.0.1/internal')).toBeNull()
  })

  it('rejects 192.168.x.x private IPs', () => {
    expect(validateDestinationUrl('http://192.168.1.1/router')).toBeNull()
  })

  it('rejects 172.16-31.x.x private IPs', () => {
    expect(validateDestinationUrl('http://172.16.0.1/')).toBeNull()
    expect(validateDestinationUrl('http://172.31.255.255/')).toBeNull()
  })

  it('rejects invalid URLs', () => {
    expect(validateDestinationUrl('not-a-url')).toBeNull()
    expect(validateDestinationUrl('')).toBeNull()
  })
})
