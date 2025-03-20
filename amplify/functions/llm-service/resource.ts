import { defineFunction, secret } from '@aws-amplify/backend';

export const llmService = defineFunction({
  name: 'llmService',
  entry: './handler.ts',
  environment: {
    // シークレットを環境変数として安全に注入
    // これらのシークレットは事前にAmplifyコンソールで定義されているか、
    // amplify/parameters.tsで定義されている必要があります
    GEMINI_API_KEY: secret('GEMINI_API_KEY'),
    DEEPSEEK_API_KEY: secret('DEEPSEEK_API_KEY')
  }
});
