import 'dotenv/config'

import type { Config } from 'drizzle-kit'
import { env } from './src/env'

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: env.DATABASE_URL,
  },
} satisfies Config
