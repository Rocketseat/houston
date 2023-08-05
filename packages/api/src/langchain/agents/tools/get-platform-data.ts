import { DynamicTool } from 'langchain/tools'

export const getPlatformData = new DynamicTool({
  name: 'get-platform-data',
  description:
    'Útil quando você precisa responder perguntas sobre programação no geral ou recomendações de conteúdo.',
  func: async () => {
    return 'Platform!'
  },
  returnDirect: true,
})
