import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 3000,
    // localhostのサーバーへのプロキシ設定
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // LLMサービスのプロキシ設定
      '/api/llm': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      }
    },
  },
  // 環境変数のプレフィックス設定
  envPrefix: 'REACT_APP_',
  // ビルド設定
  build: {
    outDir: 'build', // create-react-appとの互換性のため
    sourcemap: true,
  },
  // AWS Amplifyでのデプロイを考慮した設定
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  // 静的アセットの処理
  assetsInclude: ['**/*.jpg', '**/*.png', '**/*.svg'],
});
