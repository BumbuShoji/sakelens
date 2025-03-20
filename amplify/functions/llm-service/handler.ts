import { env } from '$amplify/env/llm-service';

// LLMサービスのハンドラー関数
export const handler = async (event) => {
  try {
    // シークレットとして保存されたAPIキーにアクセス
    const geminiApiKey = env.GEMINI_API_KEY;
    const deepseekApiKey = env.DEEPSEEK_API_KEY;

    // APIキーが設定されているか確認
    console.log(`Gemini API Key: ${geminiApiKey ? '設定済み' : '未設定'}`);
    console.log(`Deepseek API Key: ${deepseekApiKey ? '設定済み' : '未設定'}`);

    // イベントのタイプによってOCRまたはレコメンド処理を実行
    const eventType = event.path || '';
    
    if (eventType.includes('/ocr')) {
      return handleOcr(event, geminiApiKey, deepseekApiKey);
    } else if (eventType.includes('/recommend')) {
      return handleRecommend(event, geminiApiKey, deepseekApiKey);
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: '無効なリクエストパス' }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (error) {
    console.error('エラーが発生しました:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'サーバー内部エラー' }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
};

// OCR処理を行う関数
const handleOcr = async (event, geminiApiKey, deepseekApiKey) => {
  // OCR処理のロジックを実装
  // APIキーを使ってGeminiやDeepseekサービスを呼び出す
  
  return {
    statusCode: 200,
    body: JSON.stringify({ result: 'OCR処理が完了しました' }),
    headers: {
      'Content-Type': 'application/json'
    }
  };
};

// レコメンド処理を行う関数
const handleRecommend = async (event, geminiApiKey, deepseekApiKey) => {
  // レコメンド処理のロジックを実装
  // APIキーを使ってGeminiやDeepseekサービスを呼び出す
  
  return {
    statusCode: 200,
    body: JSON.stringify({ result: 'レコメンド処理が完了しました' }),
    headers: {
      'Content-Type': 'application/json'
    }
  };
};
