# Feistel hash bounding via modulo

The Feistel cipher produces a 64-bit number, but short codes must fit in 7 Base62 characters (max `62^7 ≈ 3.5 trillion` values). We apply `encrypted % 62^7` before Base62 encoding to cap the output length.

This is modulo arithmetic on a Feistel permutation — collisions occur only when two IDs produce Feistel outputs differing by a multiple of `62^7`. At 60 creates/minute, that takes ~990 years to become statistically likely. The alternative (variable-length codes) would break the UX promise of "short" links and complicate routing.

**Considered options**

- Variable-length codes (8+ chars for high IDs) — rejected because the product spec promises consistently short URLs and routing logic assumes fixed-length paths.
- Larger alphabet (Base64) — rejected for URL safety; `+` and `/` need escaping.
- Fewer Feistel rounds to keep output small — rejected because fewer rounds weakens the permutation's uniformity.

**Consequences**

- IDs above ~3.5T share the same hash space as lower IDs, but the practical ceiling for a self-hosted shortener is orders of magnitude below that.
- Changing `HASH_LENGTH` requires re-hashing all existing links (the Feistel key and modulus are coupled).
