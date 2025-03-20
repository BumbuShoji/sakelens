import { deepseekApiKey, geminiApiKey } from '../../parameters';
import { defineFunction, secret } from '@aws-amplify/backend';

export const llmService = defineFunction({
  name: 'llmService',
  entry: './handler.ts',
  environment: {
    // シークレットを環境変数として安全に注入
    GEMINI_API_KEY: geminiApiKey,
    DEEPSEEK_API_KEY: deepseekApiKey
  }
});
