import './App.css';

// src/App.tsx
import React, { useEffect, useRef, useState } from 'react';

// 結果表示用の型定義
interface RecommendationResult {
  items: {
    name: string;
    description: string;
    reason: string;
  }[];
}

const App: React.FC = () => {
  // ステート管理
  const [isCapturing, setIsCapturing] = useState<boolean>(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // カメラ要素の参照
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // カメラ初期化
  useEffect(() => {
    if (isCapturing) {
      const initCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          setError('カメラへのアクセスに失敗しました。カメラの許可を確認してください。');
          console.error('カメラエラー:', err);
        }
      };
      
      initCamera();
      
      // クリーンアップ
      return () => {
        const stream = videoRef.current?.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [isCapturing]);
  
  // 写真撮影関数
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // キャンバスのサイズをビデオに合わせる
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // 画像を描画
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageDataUrl);
        setIsCapturing(false);
        
        // 画像のアップロード（自動）
        uploadImage(imageDataUrl);
      }
    }
  };
  
  // 画像アップロード関数
  const uploadImage = async (imageDataUrl: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Base64データからBlobへ変換
      const base64Data = imageDataUrl.split(',')[1];
      const blob = base64ToBlob(base64Data, 'image/jpeg');
      
      // FormDataの作成
      const formData = new FormData();
      formData.append('image', blob, 'menu.jpg');
      
      // APIへの送信
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('画像のアップロードに失敗しました');
      }
      
      const data = await response.json();
      setResult(data.result);
    } catch (err) {
      console.error('アップロードエラー:', err);
      setError('処理中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Base64をBlobに変換するユーティリティ関数
  const base64ToBlob = (base64: string, mimeType: string) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: mimeType });
  };
  
  // 再撮影関数
  const retakePhoto = () => {
    setCapturedImage(null);
    setResult(null);
    setIsCapturing(true);
  };
  
  return (
    <div className="app-container">
      <header>
        <h1>お酒のおすすめアプリ</h1>
      </header>
      
      <main>
        {isCapturing ? (
          <div className="camera-container">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
            />
            <button 
              className="capture-button" 
              onClick={captureImage}
            >
              撮影
            </button>
          </div>
        ) : (
          <div className="result-container">
            {capturedImage && !result && (
              <div className="preview-container">
                <img src={capturedImage} alt="メニュー画像" />
                {isLoading && <div className="loading">処理中...</div>}
              </div>
            )}
            
            {result && (
              <div className="recommendation-results">
                <h2>おすすめのお酒</h2>
                <ul>
                  {result.items.map((item, index) => (
                    <li key={index} className="recommendation-item">
                      <h3>{item.name}</h3>
                      <p className="description">{item.description}</p>
                      <p className="reason"><strong>おすすめ理由:</strong> {item.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {error && (
              <div className="error-message">
                <p>{error}</p>
              </div>
            )}
            
            <button 
              className="retake-button" 
              onClick={retakePhoto}
            >
              再撮影
            </button>
          </div>
        )}
      </main>
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default App;