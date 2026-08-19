import { z } from 'zod'
import { businessService } from '../../services/businessService'

export const getBusinessInfoSchema = z.object({
  topic: z
    .enum(['all', 'address', 'hours', 'contact', 'pickup-delivery'])
    .optional()
    .default('all'),
})

export type GetBusinessInfoInput = z.infer<typeof getBusinessInfoSchema>

export interface GetBusinessInfoResult {
  brandName: string
  address?: string
  openingHours?: string[]
  contact?: { phone: string; email: string }
  pickupDelivery?: { pickup: boolean; delivery: boolean }
}

export function getBusinessInfo(input: GetBusinessInfoInput): GetBusinessInfoResult {
  const data = businessService.getBusinessInfo()
  const allResult: GetBusinessInfoResult = {
    brandName: data.logoWordmark,
    address: `${data.address}, ${data.city}`,
    openingHours: data.openingHours.map((hour) => `${hour.day}: ${hour.time}`),
    contact: { phone: data.phone, email: data.email },
    pickupDelivery: { pickup: true, delivery: true },
  }

  switch (input.topic) {
    case 'address':
      return { brandName: data.logoWordmark, address: allResult.address }
    case 'hours':
      return { brandName: data.logoWordmark, openingHours: allResult.openingHours }
    case 'contact':
      return { brandName: data.logoWordmark, contact: allResult.contact }
    case 'pickup-delivery':
      return { brandName: data.logoWordmark, pickupDelivery: allResult.pickupDelivery }
    case 'all':
    default:
      return allResult
  }
}

