import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

import { env } from '../env'

const client = postgres(env.DATABASE_URL)

const db = drizzle(client, {
  logger: false,
})

migrate(db, { migrationsFolder: './src/db/migrations' })
  .then(() => {
    console.log('Successfully applied all pending migrations.')
  })
  .finally(() => {
    process.exit()
  })
