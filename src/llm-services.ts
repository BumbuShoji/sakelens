// src/llm-service.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

// 型定義
interface OcrResult {
  text: string;
}

interface RecommendResult {
  recommendations: {
    name: string;
    description: string;
    reason: string;
  }[];
}

// Deepseek APIレスポンスの型定義
interface DeepseekResponse {
  choices?: Array<{
    text?: string;
  }>;
}

// OCRとおすすめを同時に行った結果の型定義
interface OcrAndRecommendResult {
  text: string;
  recommendations: {
    name: string;
    description: string;
    reason: string;
  }[];
}

// 環境変数の読み込み
dotenv.config();

// APIキーを環境変数から取得
// これらの環境変数はAWS Amplifyのデプロイプロセスによって、
// secret()関数で定義されたシークレットから安全に注入される
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// 開発環境でのAPIキー検証
if (!GEMINI_API_KEY || !DEEPSEEK_API_KEY) {
  console.error('APIキーが設定されていません。');
  console.error('開発環境では.envファイルに設定するか、環境変数を設定してください。');
  console.error('本番環境ではAmplifyのシークレット機能を使用します。');
  process.exit(1);
}

// DeepSeek用のOpenAIクライアントを初期化
const deepseekClient = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: DEEPSEEK_API_KEY
});

// LLMサービスの初期化
const app = express();
const PORT = process.env.PORT || process.env.LLM_SERVICE_PORT || 3002;

app.use(cors());
app.use(express.json({limit: '50mb'}));

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'llm-services',
    timestamp: new Date().toISOString()
  });
});

// Gemini-2.0-flash OCR API
app.post('/api/llm/ocr', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: '画像が提供されていません' });
    }
    
    // Google Gemini-2.0-flashを使用したOCR処理
    const ocrResult = await processOcrWithGemini(image);
    
    res.json(ocrResult);
    
  } catch (error) {
    console.error('OCRエラー:', error);
    res.status(500).json({ error: '処理中にエラーが発生しました' });
  }
});

// 新しいAPI: Geminiを使ってOCRとおすすめを一度に行う
app.post('/api/llm/ocr-and-recommend', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: '画像が提供されていません' });
    }
    
    // Gemini-2.0-flashを使用してOCRとおすすめを同時に処理
    const result = await processOcrAndRecommendWithGemini(image);
    
    res.json(result);
    
  } catch (error) {
    console.error('OCR・おすすめ処理エラー:', error);
    res.status(500).json({ error: '処理中にエラーが発生しました' });
  }
});

// Deepseek おすすめ算出 API
app.post('/api/llm/recommend', async (req, res) => {
  try {
    const { menuText } = req.body;
    
    if (!menuText) {
      return res.status(400).json({ error: 'メニューテキストが提供されていません' });
    }
    
    // Deepseek LLMを使用したおすすめ生成
    const recommendations = await generateRecommendationsWithDeepseek(menuText);
    
    res.json(recommendations);
    
  } catch (error) {
    console.error('おすすめエラー:', error);
    res.status(500).json({ error: '処理中にエラーが発生しました' });
  }
});

// Gemini-2.0-flashを使用したOCR処理関数
async function processOcrWithGemini(imageBase64: string): Promise<OcrResult> {
  try {
    // 安全に取得したAPIキーを使用
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Base64文字列から適切なフォーマットに変換（data:image/jpeg;base64, プレフィックスを追加）
    const formattedImage = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;

    // Define the prompt to extract all text (including price info) from the image
    const prompt = "この画像からすべてのテキストを抽出してください。日本語のメニューで価格情報も含めてください。";

    // Prepare the part with the image
    const imageParts = [{
      inlineData: {
        data: formattedImage.split(',')[1] || imageBase64,
        mimeType: "image/jpeg"
      }
    }];

    // Call the Gemini API with the prompt and the formatted image
    const result = await model.generateContent([prompt, ...imageParts]);
    const text = result.response.text();

    console.log("OCR結果:", text.substring(0, 100) + "..."); // ログ出力追加
    
    // Return the extracted text from the API response
    return { text };
  } catch (error) {
    console.error("Gemini OCR処理エラー:", error);
    throw error;
  }
}

// Gemini-2.0-flashを使用したOCRとおすすめを一度に行う関数
async function processOcrAndRecommendWithGemini(imageBase64: string): Promise<OcrAndRecommendResult> {
  try {
    // 安全に取得したAPIキーを使用
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash"
    });

    // Base64文字列を適切なフォーマットに変換
    const formattedImage = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;

    // OCRとおすすめを同時に行うプロンプト
    const prompt = `
この画像にあるメニュー全体のテキストを抽出し、さらに含まれているドリンクの中からおすすめのドリンク3つを選んでください。

必ず以下の形式のJSONで回答してください：
{
  "text": "ここに抽出されたメニューのテキスト全体を入れる",
  "recommendations": [
    {"name": "商品名", "description": "説明", "reason": "おすすめ理由"},
    {"name": "商品名", "description": "説明", "reason": "おすすめ理由"},
    {"name": "商品名", "description": "説明", "reason": "おすすめ理由"}
  ]
}
`;

    // 画像の準備
    const imageParts = [{
      inlineData: {
        data: formattedImage.split(',')[1] || imageBase64,
        mimeType: "image/jpeg"
      }
    }];

    // Gemini APIの呼び出し - 修正済み
    const result = await model.generateContent([
      { text: prompt }, 
      ...imageParts
    ]);
    
    const responseText = result.response.text();
    console.log("Gemini OCR・おすすめ結果:", responseText.substring(0, 100) + "...");
    
    // JSONとしてパースして返す
    try {
      const parsedResult = JSON.parse(responseText) as OcrAndRecommendResult;
      return parsedResult;
    } catch (parseError) {
      console.error("JSON解析エラー:", responseText);
      return {
        text: responseText,
        recommendations: [
          { 
            name: "レスポンス解析エラー", 
            description: "APIからの応答を解析できませんでした", 
            reason: "技術的な問題が発生しました" 
          }
        ]
      };
    }
  } catch (error) {
    console.error("Gemini OCR・おすすめ処理エラー:", error);
    throw error;
  }
}

// Deepseekを使用したおすすめ生成関数
async function generateRecommendationsWithDeepseek(menuText: string): Promise<RecommendResult> {
  try {
    console.log("メニューテキスト処理開始:", menuText.substring(0, 100) + "...");
    
    const completion = await deepseekClient.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { 
          role: "system", 
          content: `あなたは日本語で応答するAIアシスタントです。提供されたメニューから最適なおすすめを提案します。
必ずJSON形式で応答してください。

例えば以下のようなJSON形式で返答します:
{
  "recommendations": [
    {"name": "山崎12年", "description": "シングルモルトウイスキー", "reason": "和食との相性が良い"},
    {"name": "獺祭", "description": "純米大吟醸", "reason": "魚料理に合う辛口の日本酒"},
    {"name": "白ワイン", "description": "シャルドネ", "reason": "軽い前菜に最適"}
  ]
}`
        },
        {
          role: "user",
          content: `次のメニューから、おすすめのドリンク3つを選び、名前、説明、おすすめ理由を日本語で提供してください。必ず以下の形式のJSONで返答してください：
{
  "recommendations": [
    {"name": "商品名", "description": "説明", "reason": "おすすめ理由"},
    {"name": "商品名", "description": "説明", "reason": "おすすめ理由"},
    {"name": "商品名", "description": "説明", "reason": "おすすめ理由"}
  ]
}

メニュー:
${menuText}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });
    
    console.log("Deepseekレスポンス概要:", {
      status: completion.choices?.[0]?.finish_reason,
      contentLength: completion.choices?.[0]?.message?.content?.length || 0
    });
    
    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error("Deepseek APIからの応答が無効です");
    }
    
    try {
      const parsedResult = JSON.parse(responseText);
      return parsedResult;
    } catch (parseError) {
      console.error("JSON解析エラー:", responseText);
      return {
        recommendations: [
          { 
            name: "レスポンス解析エラー", 
            description: "APIからの応答を解析できませんでした", 
            reason: "技術的な問題が発生しました" 
          }
        ]
      };
    }
  } catch (error) {
    console.error("Deepseekおすすめ生成エラー:", error);
    throw error;
  }
}

// 開発環境用のAPIキー取得状態確認関数
const getApiKeyStatus = () => {
  return { 
    geminiApiKey: GEMINI_API_KEY ? '設定済み' : '未設定',
    deepseekApiKey: DEEPSEEK_API_KEY ? '設定済み' : '未設定'
  };
};

// サーバー起動
app.listen(PORT, () => {
  const keyStatus = getApiKeyStatus();
  console.log(`LLMサービスが起動しました: http://localhost:${PORT}`);
  console.log(`Gemini API Key: ${keyStatus.geminiApiKey}`);
  console.log(`Deepseek API Key: ${keyStatus.deepseekApiKey}`);
});
