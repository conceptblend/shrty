export interface Link {
  id: number
  hash: string
  destinationUrl: string
  createdAt: string
  expiresAt: string | null
  isDeleted: boolean
  clickCount: number
}

export interface CreateLinkRequest {
  url: string
  customSlug?: string
  expiresAt?: string
}

export interface CreateLinkResponse {
  hash: string
  shortUrl: string
  destinationUrl: string
  createdAt: string
  expiresAt: string | null
}

export interface UpdateLinkRequest {
  destinationUrl?: string
  expiresAt?: string | null
}

export interface LinkListParams {
  cursor?: number
  limit?: number
}

export interface PaginatedLinks {
  links: Link[]
  nextCursor: number | null
}

export interface ClickEvent {
  hash: string
  clickedAt: string
  referrer: string | null
  deviceType: string | null
  browser: string | null
  os: string | null
  country: string | null
}

export interface AnalyticsSummary {
  hash: string
  destinationUrl: string
  createdAt: string
  totalClicks: number
  uniqueVisitors: number
  clicksByDay: { date: string; clicks: number; uniqueVisitors: number }[]
  topReferrers: { referrer: string; clicks: number }[]
  devices: { type: string; clicks: number }[]
  browsers: { browser: string; clicks: number }[]
  countries: { country: string; clicks: number; percentage: number }[]
  recentClicks: ClickEvent[]
}

export interface ApiError {
  error: string
  message: string
}
