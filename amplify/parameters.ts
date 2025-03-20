import { defineParameter, secret } from '@aws-amplify/backend';

// Gemini APIキーのシークレットパラメータ
export const geminiApiKey = defineParameter('GEMINI_API_KEY', {
  type: 'String',
  default: secret('GEMINI_API_KEY')
});

// Deepseek APIキーのシークレットパラメータ
export const deepseekApiKey = defineParameter('DEEPSEEK_API_KEY', {
  type: 'String',
  default: secret('DEEPSEEK_API_KEY')
});
