import { auth } from './auth/resource';
import { data } from './data/resource';
import { defineBackend } from '@aws-amplify/backend';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
defineBackend({
  auth,
  data,
  // secretsReferencesは削除し、代わりに各リソースで直接secret関数を使用
});
