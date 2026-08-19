import type { BusinessInfo } from '../types/business'

export const businessInfo: BusinessInfo = {
  brandName: 'AURELIA',
  logoWordmark: 'AURELIA Café',
  tagline: 'Crafted coffee. Quiet luxury. Everyday.',
  story:
    'AURELIA is a modern specialty café designed around thoughtful coffee, seasonal food, and calm city moments. We combine precision brewing with warm hospitality to create a place where quality feels effortless.',
  philosophy: [
    'Specialty-grade beans sourced from transparent partner farms.',
    'House-made syrups, fresh pastries, and ingredient-forward breakfast.',
    'Skilled baristas, consistent recipes, and modern café culture.',
  ],
  address: '17 Yaroslaviv Val St',
  city: 'Kyiv, Ukraine',
  phone: '+380 67 555 14 28',
  email: 'hello@aureliacafe.ua',
  openingHours: [
    { day: 'Mon–Fri', time: '08:00 – 21:00' },
    { day: 'Saturday', time: '09:00 – 22:00' },
    { day: 'Sunday', time: '09:00 – 20:00' },
  ],
  socials: [
    { label: 'Instagram', url: 'https://instagram.com' },
    { label: 'Facebook', url: 'https://facebook.com' },
    { label: 'TikTok', url: 'https://tiktok.com' },
  ],
  mapEmbedHint: 'Map integration placeholder: Google Maps / OpenStreetMap embed here.',
}
