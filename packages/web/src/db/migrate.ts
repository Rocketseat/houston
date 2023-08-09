import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

import { env } from '../env'

const client = postgres(env.DATABASE_URL, {
  ssl: 'require',
  max: 1,
})

const db = drizzle(client, {
  logger: false,
})

migrate(db, {
  migrationsFolder: './src/db/migrations',
  migrationsTable: 'migrations',
})
  .then(() => {
    console.log('Successfully applied all pending migrations.')
  })
  .catch((err) => {
    console.error(err)
  })
  .finally(() => {
    process.exit()
  })
