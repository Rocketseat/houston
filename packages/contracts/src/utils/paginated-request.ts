import { z } from 'zod'

export const paginatedRequest = z.object({
  pageIndex: z.string().transform(Number).pipe(z.number().min(0).default(0)),
  pageSize: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(20).default(5)),
})
