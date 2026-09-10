import { createHash } from 'node:crypto'

const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const BASE = BigInt(62)
const HASH_LENGTH = 7
const MAX_HASH_VALUE = BASE ** BigInt(HASH_LENGTH)
const FEISTEL_ROUNDS = 4

function feistelRound(right: bigint, key: string, round: number): bigint {
  const data = new TextEncoder().encode(`${key}:${round}:${right}`)
  const hash = createHash('sha256').update(data).digest()
  return hash.readBigUInt64BE(0) & ((1n << 32n) - 1n)
}

function feistelEncrypt(id: number, key: string): bigint {
  const n = BigInt(id)
  const mask = (1n << 32n) - 1n
  let left = (n >> 32n) & mask
  let right = n & mask

  for (let i = 0; i < FEISTEL_ROUNDS; i++) {
    const newRight = left ^ feistelRound(right, key, i)
    left = right
    right = newRight
  }

  return (left << 32n) | right
}

function encodeBase62(num: bigint): string {
  if (num === 0n) return BASE62_ALPHABET[0]
  let n = num
  let result = ''
  while (n > 0n) {
    result = BASE62_ALPHABET[Number(n % BASE)] + result
    n = n / BASE
  }
  return result
}

export function generateHash(id: number, feistelKey: string): string {
  const encrypted = feistelEncrypt(id, feistelKey)
  const bounded = encrypted % MAX_HASH_VALUE
  const encoded = encodeBase62(bounded)
  return encoded.padStart(HASH_LENGTH, '0')
}
