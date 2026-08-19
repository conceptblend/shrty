import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventBus } from '../lib/events'

describe('EventBus', () => {
  let bus: EventBus

  beforeEach(() => {
    bus = new EventBus()
  })

  it('calls subscribers when event is emitted', async () => {
    const handler = vi.fn()
    bus.on('click:recorded', handler)

    await bus.emit('click:recorded', {
      hash: 'abc1234',
      ipHash: 'hash123',
      referrer: null,
      userAgent: null,
      deviceType: null,
      browser: null,
      os: null,
      country: null,
    })

    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ hash: 'abc1234' }))
  })

  it('supports multiple subscribers', async () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    bus.on('click:recorded', handler1)
    bus.on('click:recorded', handler2)

    await bus.emit('click:recorded', {
      hash: 'test',
      ipHash: 'h',
      referrer: null,
      userAgent: null,
      deviceType: null,
      browser: null,
      os: null,
      country: null,
    })

    expect(handler1).toHaveBeenCalledOnce()
    expect(handler2).toHaveBeenCalledOnce()
  })

  it('does not block on failing subscribers', async () => {
    const failingHandler = vi.fn().mockRejectedValue(new Error('boom'))
    const successHandler = vi.fn()
    bus.on('click:recorded', failingHandler)
    bus.on('click:recorded', successHandler)

    // Should not throw
    await bus.emit('click:recorded', {
      hash: 'test',
      ipHash: 'h',
      referrer: null,
      userAgent: null,
      deviceType: null,
      browser: null,
      os: null,
      country: null,
    })

    expect(successHandler).toHaveBeenCalledOnce()
  })

  it('does not call handlers for different events', async () => {
    const handler = vi.fn()
    bus.on('link:created', handler)

    await bus.emit('click:recorded', {
      hash: 'test',
      ipHash: 'h',
      referrer: null,
      userAgent: null,
      deviceType: null,
      browser: null,
      os: null,
      country: null,
    })

    expect(handler).not.toHaveBeenCalled()
  })
})
