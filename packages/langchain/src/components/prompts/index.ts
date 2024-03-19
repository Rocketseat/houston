import { supportPrompt } from './support'
import { technicalPrompt } from './technical'

type PromptType = 'technical' | 'support'

export function getPrompt(type: PromptType) {
  switch (type) {
    case 'technical':
      return technicalPrompt
    case 'support':
      return supportPrompt
    default:
      return technicalPrompt
  }
}
