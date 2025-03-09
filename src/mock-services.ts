import { OcrResult, RecommendResult } from './types';

import cors from 'cors';
import express from 'express';

// モックサーバーの初期化
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({limit: '10mb'}));

// OCR モックAPI
app.post('/api/ocr', (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: '画像が提供されていません' });
    }
    
    // 実際のシステムでは、ここでLLMを用いたOCR処理を実施
    
    // モック結果（サンプルの抽出テキスト）
    const ocrResult: OcrResult = {
      text: `
      ドリンクメニュー
      ----------------------
      ビール
      - アサヒスーパードライ ¥600
      - サッポロ黒ラベル ¥650
      - よなよなエール ¥700
      
      ワイン
      - ハウスワイン（赤/白） グラス ¥500
      - カベルネソーヴィニヨン ボトル ¥4,800
      - シャルドネ ボトル ¥4,200
      
      日本酒
      - 獺祭 純米大吟醸 ¥900
      - 八海山 特別本醸造 ¥750
      - 久保田 千寿 ¥800
      
      焼酎
      - 芋焼酎「森伊蔵」 ¥1,200
      - 麦焼酎「百年の孤独」 ¥1,100
      - 米焼酎「鳥飼」 ¥900
      
      カクテル
      - モヒート ¥800
      - ジントニック ¥750
      - カシスオレンジ ¥700
      `
    };
    
    setTimeout(() => {
      res.json(ocrResult);
    }, 1500); // 処理時間のシミュレーション
    
  } catch (error) {
    console.error('モックOCRエラー:', error);
    res.status(500).json({ error: '処理中にエラーが発生しました' });
  }
});

// おすすめ算出 モックAPI
app.post('/api/recommend', (req, res) => {
  try {
    const { menuText } = req.body;
    
    if (!menuText) {
      return res.status(400).json({ error: 'メニューテキストが提供されていません' });
    }
    
    // 実際のシステムでは、ここでLLMを用いたおすすめ算出処理を実施
    
    // モック結果（サンプルの推薦）
    const recommendations: RecommendResult = {
      items: [
        {
          name: "獺祭 純米大吟醸",
          description: "山口県の旭酒造が製造する特A地区の山田錦を使用した純米大吟醸酒。フルーティーな香りと繊細な味わいが特徴です。",
          reason: "メニューの中で最もプレミアムな日本酒であり、食事との相性も良く、特別な機会にぴったりです。"
        },
        {
          name: "よなよなエール",
          description: "長野県のヤッホーブルーイングが製造するクラフトビール。芳醇なホップの香りとフルーティな味わいのアメリカンペールエール。",
          reason: "通常のビールより風味豊かで、クラフトビール初心者にもおすすめの一杯です。"
        },
        {
          name: "カベルネソーヴィニヨン",
          description: "フルボディの赤ワインで、濃厚な果実味とタンニンのバランスが取れた味わい。肉料理との相性抜群です。",
          reason: "メニューの中で最も本格的な赤ワインであり、グループでシェアするのに適しています。"
        }
      ]
    };
    
    setTimeout(() => {
      res.json(recommendations);
    }, 2000); // 処理時間のシミュレーション
    
  } catch (error) {
    console.error('モックおすすめエラー:', error);
    res.status(500).json({ error: '処理中にエラーが発生しました' });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`モックサービスが起動しました: http://localhost:${PORT}`);
});