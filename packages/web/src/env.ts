import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
})

export const env = envSchema.parse(process.env)
