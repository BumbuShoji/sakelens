import axios from 'axios';
import dotenv from 'dotenv';
// src/server.ts
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';

// 環境変数の読み込み
dotenv.config();

// Express アプリケーションの初期化
const app = express();
const PORT = process.env.PORT || 5000; // 3000から5000に変更

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
    
    // OCR処理を実行
    const ocrResult = await processOCR(filePath);

    // おすすめを取得
    const recommendations = await getRecommendations(ocrResult);
    
    // 一時ファイルの削除（セキュリティのため）
    fs.unlinkSync(filePath);
    
    // レスポンスのフォーマットを調整
    const formattedResult = {
      items: recommendations.recommendations.map(item => ({
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
    return res.status(500).json({ 
      error: '処理中にエラーが発生しました' 
    });
  }
});

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
    throw new Error('OCR処理中にエラーが発生しました');
  }
}

// おすすめ取得関数
async function getRecommendations(ocrText: string) {
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
    
    return response.data;
    
  } catch (error) {
    console.error('おすすめ取得エラー:', error);
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