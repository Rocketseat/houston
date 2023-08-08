import { createChainFromMemories } from './langchain/chains/houston'

async function run() {
  const houston = await createChainFromMemories([])

  const response = await houston.run(
    'Qual a diferença do Redux para o Zustand?',
  )

  console.log(response)
}

run()
