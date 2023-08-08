import { RouterOutputParser } from 'langchain/output_parsers'
import { PromptTemplate } from 'langchain/prompts'
import { z } from 'zod'

const routerParser = RouterOutputParser.fromZodSchema(
  z.object({
    destination: z
      .string()
      .describe('nome do prompt a ser utilizado ou "DEFAULT"'),
    next_inputs: z.object({
      input: z
        .string()
        .describe('uma versão potencialmente modificada do input original'),
    }),
  }),
)

const routerFormat = routerParser.getFormatInstructions()

export const routerPrompt = new PromptTemplate({
  inputVariables: ['destinations', 'input'],
  outputParser: routerParser,
  partialVariables: {
    format_instructions: routerFormat,
  },
  template: `
    Dada uma entrada de texto bruto para um modelo de linguagem, selecione o modelo de prompt mais adequado para a entrada.
    Você receberá os nomes dos prompts disponíveis e uma descrição de em que situações o prompt é o mais adequado.

    Você também pode corrigir a entrada de texto original se achar que corrigi-la vai levar a uma melhor resposta do modelo de linguagem.

    << FORMATAÇÃO >>
    {format_instructions}

    LEMBRE: "destination" DEVE ser um dos prompts especificados abaixo OU pode ser "DEFAULT" se o input não se encaixar em nenhum dos prompts.
    LEMBRE: "next_inputs" pode ser o input original do usuário se você achar que nenhuma modificação é necessária.

    << PROMPTS DISPONÍVEIS >>
    {destinations}

    << INPUT >>
    {input}

    << OUTPUT  (lembre de incluir \`\`\`json)>>
    `.trim(),
})
