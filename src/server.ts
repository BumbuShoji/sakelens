import { OcrResult, RecommendResult, RecommendationItem } from './types';

import axios from 'axios';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';

// 環境変数の読み込み
dotenv.config();

// Express アプリケーションの初期化
const app = express();
const PORT = process.env.PORT || 3001; // デフォルト値を3001に変更

// アップロードディレクトリの設定
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 一時ファイル保存用の設定
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
});

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, '../build')));
app.use(express.json());

// 画像アップロードAPI
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '画像が提供されていません' });
    }

    // ファイルパスを取得
    const filePath = req.file.path;
    
    // OCR処理とおすすめの提案を一度に実行
    const result = await processOcrAndGetRecommendations(filePath);
    
    // 一時ファイルの削除（セキュリティのため）
    fs.unlinkSync(filePath);
    
    // レスポンスのフォーマットを調整
    const formattedResult = {
      items: result.recommendations.map((item: RecommendationItem) => ({
        name: item.name,
        description: item.description,
        reason: item.reason
      }))
    };
    
    // 結果を返却
    return res.json({ 
      success: true,
      result: formattedResult
    });
    
  } catch (error) {
    console.error('処理エラー:', error);
    // エラーの詳細を出力
    if (error instanceof Error) {
      console.error('エラーメッセージ:', error.message);
      console.error('エラースタック:', error.stack);
    }
    return res.status(500).json({ 
      error: '処理中にエラーが発生しました' 
    });
  }
});

// OCRとおすすめ取得を一度に行う関数
async function processOcrAndGetRecommendations(imagePath: string): Promise<RecommendResult> {
  try {
    // 画像ファイルをBase64エンコード
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // LLMサービスの統合APIへのリクエスト
    const response = await axios.post(
      process.env.LLM_OCR_RECOMMEND_API_URL || 'http://localhost:3002/api/llm/ocr-and-recommend',
      {
        image: base64Image
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status !== 200) {
      throw new Error('OCRとおすすめの処理に失敗しました');
    }
    
    console.log("OCR・おすすめ処理結果:", response.data.text?.substring(0, 100) + "...");
    
    return {
      recommendations: response.data.recommendations || []
    };
    
  } catch (error) {
    console.error('OCR・おすすめ処理エラー:', error);
    // エラーの詳細を出力
    if (error instanceof Error) {
      console.error('エラーメッセージ:', error.message);
      console.error('エラースタック:', error.stack);
    }
    throw new Error('OCRとおすすめの処理中にエラーが発生しました');
  }
}

// 以下は残して置くが、新しい統合APIの方を優先して使用する
// OCR処理関数
async function processOCR(imagePath: string): Promise<string> {
  try {
    // 画像ファイルをBase64エンコード
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // LLMサービスのOCR APIへのリクエスト
    const response = await axios.post(
      process.env.LLM_OCR_API_URL || 'http://localhost:3002/api/llm/ocr',
      {
        image: base64Image
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status !== 200) {
      throw new Error('OCR処理に失敗しました');
    }
    
    return response.data.text || '';
    
  } catch (error) {
    console.error('OCRエラー:', error);
    // エラーの詳細を出力
    if (error instanceof Error) {
      console.error('OCRエラーメッセージ:', error.message);
      console.error('OCRエラースタック:', error.stack);
    }
    throw new Error('OCR処理中にエラーが発生しました');
  }
}

// おすすめ取得関数
async function getRecommendations(ocrText: string): Promise<RecommendResult> {
  try {
    // LLMサービスのおすすめAPIへのリクエスト
    const response = await axios.post(
      process.env.LLM_RECOMMEND_API_URL || 'http://localhost:3002/api/llm/recommend',
      {
        menuText: ocrText
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status !== 200) {
      throw new Error('おすすめ取得に失敗しました');
    }
    
    return response.data as RecommendResult;
    
  } catch (error) {
    console.error('おすすめ取得エラー:', error);
    // エラーの詳細を出力
    if (error instanceof Error) {
      console.error('おすすめエラーメッセージ:', error.message);
      console.error('おすすめエラースタック:', error.stack);
    }
    throw new Error('おすすめ取得中にエラーが発生しました');
  }
}

// その他のルートは全てReactアプリにリダイレクト
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});