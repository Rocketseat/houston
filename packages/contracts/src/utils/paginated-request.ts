import { z } from 'zod'

export const paginatedRequest = z.object({
  pageIndex: z.number().default(0),
  pageSize: z.number().default(5),
})
