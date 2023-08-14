import { StuffDocumentsChain, StuffDocumentsChainInput } from 'langchain/chains'
import { PromptTemplate } from 'langchain/prompts'
import { Document } from 'langchain/document'
import { ChainValues } from 'langchain/schema'

export interface CombineDocsWithMetadataChainInput
  extends StuffDocumentsChainInput {
  template?: string
}

function parseTemplate(
  template: string,
  data: { [key: string]: string },
): string {
  let result = template

  for (const key in data) {
    const value = data[key]
    const regex = new RegExp(`{{${key}}}`, 'g')

    result = result.replace(regex, value)
  }

  return result
}

export class CombineDocsWithMetadataChain
  extends StuffDocumentsChain
  implements CombineDocsWithMetadataChainInput
{
  template: string

  constructor({
    template = `{{pageContent}}`,
    ...fields
  }: CombineDocsWithMetadataChainInput) {
    super(fields)

    this.template = template
  }

  /** @ignore */
  _prepInputs(values: ChainValues): ChainValues {
    if (!(this.inputKey in values)) {
      throw new Error(`Document key ${this.inputKey} not found.`)
    }

    const { [this.inputKey]: docs, ...rest } = values

    const documents: Document[] = docs

    const texts = documents.map(({ pageContent, metadata }) => {
      const documentData = { pageContent, ...metadata }

      return parseTemplate(this.template, documentData)
    })

    const text = texts.join('\n\n')

    return {
      ...rest,
      [this.documentVariableName]: text,
    }
  }
}
