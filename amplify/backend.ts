import { auth } from './auth/resource';
import { data } from './data/resource';
import { defineBackend } from '@aws-amplify/backend';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
defineBackend({
  auth,
  data,
  // シークレットを使用する場合はSSMシークレット設定に環境変数名を指定
  // secretsReferences: ['GEMINI_API_KEY', 'DEEPSEEK_API_KEY']
});
