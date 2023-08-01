import { z } from 'zod'

export const paginatedResponse = z.object({
  totalCount: z.number(),
})
