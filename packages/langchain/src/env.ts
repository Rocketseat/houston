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
  QDRANT_URL: z.string().min(1),
  QDRANT_API_KEY: z.string().optional().refine(requiredOnEnv('production')),
  OPENAI_API_KEY: z.string().min(1),
})

export const env = envSchema.parse(process.env)
