type EventMap = {
  'click:recorded': {
    hash: string
    ipHash: string
    referrer: string | null
    userAgent: string | null
    deviceType: string | null
    browser: string | null
    os: string | null
    country: string | null
  }
  'link:created': { hash: string; destinationUrl: string }
  'link:deleted': { hash: string }
}

type EventHandler<T> = (data: T) => void | Promise<void>

export class EventBus {
  private listeners = new Map<string, Set<EventHandler<unknown>>>()

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler as EventHandler<unknown>)
  }

  async emit<K extends keyof EventMap>(event: K, data: EventMap[K]): Promise<void> {
    const handlers = this.listeners.get(event) ?? new Set()
    await Promise.allSettled([...handlers].map(h => h(data)))
  }
}

export type { EventMap }
