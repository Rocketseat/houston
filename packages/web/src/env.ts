import { z } from 'zod'

const nodeEnv = z.enum(['development', 'production'])

function requiredOnEnv(env: z.infer<typeof nodeEnv>) {
  return (value: any) => {
    if (env === process.env.NODE_ENV && !value) {
      return false
    }

    return true
  }
}

const envSchema = z.object({
  NODE_ENV: nodeEnv.default('development'),
  DATABASE_URL: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  QSTASH_CURRENT_SIGNING_KEY: z.string().refine(requiredOnEnv('production')),
  QSTASH_NEXT_SIGNING_KEY: z.string().refine(requiredOnEnv('production')),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  NIVO_SIGNING_KEY: z.string().refine(requiredOnEnv('production')),
  MIGRATION_SECRET: z.string().refine(requiredOnEnv('production')),
})

export const env = envSchema.parse(process.env)
