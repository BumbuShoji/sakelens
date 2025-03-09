// src/llm-service.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
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

// 環境変数の読み込み
dotenv.config();

// LLMサービスの初期化
const app = express();
const PORT = process.env.LLM_SERVICE_PORT || 3002;

app.use(cors());
app.use(express.json({limit: '50mb'}));

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
    // Initialize Gemini client using the API key from environment variables
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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

// Deepseekを使用したおすすめ生成関数
async function generateRecommendationsWithDeepseek(menuText: string): Promise<RecommendResult> {
  try {
    console.log("メニューテキスト処理開始:", menuText.substring(0, 100) + "...");
    
    const response = await fetch("https://api.deepseek.com/v1/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        prompt: `次のメニューから、おすすめのドリンク3つを選び、名前、説明、おすすめ理由を日本語で提供してください。次の形式のJSONで返答してください：
        {
          "recommendations": [
            {"name": "商品名", "description": "説明", "reason": "おすすめ理由"},
            {"name": "商品名", "description": "説明", "reason": "おすすめ理由"},
            {"name": "商品名", "description": "説明", "reason": "おすすめ理由"}
          ]
        }
        
        メニュー:
        ${menuText}`,
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    const data = await response.json();
    console.log("Deepseekレスポンス:", data);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].text) {
      throw new Error("Deepseek APIからの応答が無効です");
    }
    
    try {
      const parsedResult = JSON.parse(data.choices[0].text);
      return parsedResult;
    } catch (parseError) {
      console.error("JSON解析エラー:", data.choices[0].text);
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

// サーバー起動
app.listen(PORT, () => {
  console.log(`LLMサービスが起動しました: http://localhost:${PORT}`);
  console.log(`Gemini API Key: ${process.env.GEMINI_API_KEY ? '設定済み' : '未設定'}`);
  console.log(`Deepseek API Key: ${process.env.DEEPSEEK_API_KEY ? '設定済み' : '未設定'}`);
});
