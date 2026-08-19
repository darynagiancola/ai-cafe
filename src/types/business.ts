export interface OpeningHour {
  day: string
  time: string
}

export interface SocialLink {
  label: string
  url: string
}

export interface BusinessInfo {
  brandName: string
  logoWordmark: string
  tagline: string
  story: string
  philosophy: string[]
  address: string
  city: string
  phone: string
  email: string
  openingHours: OpeningHour[]
  socials: SocialLink[]
  mapEmbedHint: string
}
