# Houston

Rocketseat platform for semantic search and AI chatbot.

## Running locally

### Setup containers

```sh
docker-compose up -d
```

### Setup environment

```sh
cp ./packages/api/.env.example ./packages/api/.env
cp ./packages/consumer/.env.example ./packages/consumer/.env
cp ./packages/langchain/.env.example ./packages/langchain/.env
```

> Open each `.env` file and fill with the desired variables.

### Seed sample data

```sh
cd ./packages/langchain && pnpm tsx src/sample/seed.ts
```

The seeder includes data from **252 lessons** of React Ignite trail.

### Use the API (HTTPie recommended)

```sh
http --stream POST localhost:3000/api/messages text="O que é Redux?" title="Sample chat" --auth-type bearer --auth "VALID_SKYLAB_JWT"
```

### V2

- [ ] Lesson context
- [ ] Semantic Cache
- [ ] Better memory

## Packages

- `packages/contracts`: Typings and Zod schemas for all Houston requests/responses;
- `packages/api`: Houston Web API, which offers HTTP endpoints;
- `packages/consumer`: Kafka consumer that ingest platform data;
- `packages/langchain`: Functions to interact with OpenAI;