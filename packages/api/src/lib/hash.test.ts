import { describe, it, expect } from 'vitest'
import { generateHash } from '../lib/hash'

describe('generateHash', () => {
  const key = 'test-secret-key-for-feistel'

  it('produces a 7-character Base62 string', () => {
    const hash = generateHash(1, key)
    expect(hash).toHaveLength(7)
    expect(hash).toMatch(/^[0-9a-zA-Z]+$/)
  })

  it('produces different hashes for different IDs', () => {
    const hash1 = generateHash(1, key)
    const hash2 = generateHash(2, key)
    expect(hash1).not.toBe(hash2)
  })

  it('produces the same hash for the same ID and key', () => {
    const hash1 = generateHash(42, key)
    const hash2 = generateHash(42, key)
    expect(hash1).toBe(hash2)
  })

  it('produces different hashes for different keys', () => {
    const hash1 = generateHash(1, key)
    const hash2 = generateHash(1, 'different-key-here-for-test')
    expect(hash1).not.toBe(hash2)
  })

  it('does not produce sequential outputs', () => {
    const hashes = Array.from({ length: 10 }, (_, i) => generateHash(i + 1, key))
    // If outputs were sequential, each would be "next" in Base62
    // Check they're not in order
    const sorted = [...hashes].sort()
    expect(hashes).not.toEqual(sorted)
  })

  it('does not share a long common prefix across sequential IDs', () => {
    // Regression test: a degenerate round function once left the top half of
    // the Feistel output constant for every ID, so sequential IDs produced
    // hashes differing only in their last character or two.
    const hashes = Array.from({ length: 20 }, (_, i) => generateHash(i + 1, key))
    const prefixes = new Set(hashes.map((hash) => hash.slice(0, 4)))
    expect(prefixes.size).toBeGreaterThan(1)
  })
})
