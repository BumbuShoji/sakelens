// 環境設定を一元管理するための設定ファイル

const config = {
  // APIエンドポイント
  apiUrl: import.meta.env.VITE_REACT_APP_API_URL || '/api',
  llmServiceUrl: import.meta.env.VITE_REACT_APP_LLM_SERVICE_URL || 'http://localhost:3002',
  
  // OCR APIエンドポイント
  ocrApiEndpoint: '/api/llm/ocr',
  
  // OCRとレコメンデーションAPIエンドポイント
  ocrAndRecommendApiEndpoint: '/api/llm/ocr-and-recommend',
  
  // 画像アップロードAPIエンドポイント
  uploadApiEndpoint: '/api/upload',
  
  // その他の設定値
  imageQuality: 0.9,
  imageFormat: 'image/jpeg'
};

export default config;
