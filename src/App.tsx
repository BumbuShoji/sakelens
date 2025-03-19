import './App.css';

// src/App.tsx
import React, { useEffect, useRef, useState } from 'react';

// 正しい拡張子なしでインポート
import config from './config';

// 結果表示用の型定義
interface RecommendationResult {
  items: {
    name: string;
    description: string;
    reason: string;
  }[];
}

// OCR結果の型定義
interface OcrResult {
  text: string;
}

const App: React.FC = () => {
  // ステート管理
  const [isCapturing, setIsCapturing] = useState<boolean>(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPcView, setIsPcView] = useState<boolean>(false);
  const [isSecureContext, setIsSecureContext] = useState<boolean>(true);
  const [showFlash, setShowFlash] = useState<boolean>(false);
  
  // カメラ要素の参照
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // セキュアコンテキストのチェック
  useEffect(() => {
    setIsSecureContext(window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  }, []);
  
  // 画面サイズ検知
  useEffect(() => {
    const checkScreenSize = () => {
      setIsPcView(window.innerWidth >= 1024);
    };
    
    // 初期チェック
    checkScreenSize();
    
    // リサイズ時のイベントリスナー
    window.addEventListener('resize', checkScreenSize);
    
    // クリーンアップ
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);
  
  // カメラ初期化
  useEffect(() => {
    if (isCapturing) {
      const initCamera = async () => {
        try {
          // セキュアでないコンテキストのチェック
          if (!isSecureContext) {
            setError('カメラへのアクセスにはHTTPS接続が必要です。HTTPSでアクセスするか、localhostを使用してください。');
            return;
          }
          
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError('お使いのブラウザはカメラアクセスをサポートしていません。');
            return;
          }
          
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err: any) {
          console.error('カメラエラー:', err);
          
          // より詳細なエラーメッセージ
          if (err.name === 'NotAllowedError') {
            setError('カメラへのアクセスが拒否されました。ブラウザの設定でカメラへのアクセスを許可してください。');
          } else if (err.name === 'NotFoundError') {
            setError('カメラが見つかりません。デバイスにカメラが接続されていることを確認してください。');
          } else if (err.name === 'NotReadableError') {
            setError('カメラにアクセスできません。すでに他のアプリケーションがカメラを使用している可能性があります。');
          } else if (err.name === 'OverconstrainedError') {
            setError('指定されたカメラ設定が利用できません。');
          } else if (err.name === 'SecurityError') {
            setError('セキュリティ上の理由でカメラへのアクセスが拒否されました。HTTPSでアクセスしてください。');
          } else {
            setError(`カメラへのアクセスに失敗しました: ${err.message || '不明なエラー'}`);
          }
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
  }, [isCapturing, isSecureContext]);
  
  // 写真撮影関数
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      // フラッシュエフェクト表示
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 300);
      
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
      const blob = base64ToBlob(base64Data, config.imageFormat);
      
      // APIエンドポイントの選択（環境に応じて設定ファイルから取得）
      const apiEndpoint = `${config.apiUrl}/upload`;
      
      // FormDataの作成
      const formData = new FormData();
      formData.append('image', blob, 'menu.jpg');
      
      // APIへの送信
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`サーバーエラー: ${response.status}`);
      }
      
      const data = await response.json();
      setResult(data.result);
    } catch (err: any) {
      console.error('アップロードエラー:', err);
      setError(`処理中にエラーが発生しました: ${err.message || 'もう一度お試しください。'}`);
      
      // 代替手段: 直接LLMサービスのOCR APIを呼び出す
      if (config.llmServiceUrl) {
        try {
          await processWithDirectLlmService(imageDataUrl);
        } catch (fallbackErr) {
          console.error('代替処理エラー:', fallbackErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // 代替手段: 直接LLMサービスを使用する関数
  const processWithDirectLlmService = async (imageDataUrl: string) => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Base64データの準備
      const base64Data = imageDataUrl.split(',')[1];
      
      // OCRとレコメンデーション処理を直接呼び出し
      const response = await fetch(`${config.llmServiceUrl}${config.ocrAndRecommendApiEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Data }),
      });
      
      if (!response.ok) {
        throw new Error('OCR処理に失敗しました');
      }
      
      const data = await response.json();
      
      // レコメンデーション結果の設定
      if (data && data.recommendations) {
        setResult({
          items: data.recommendations.items || []
        });
      }
    } catch (err: any) {
      console.error('代替処理エラー:', err);
      setError(`代替処理でもエラーが発生しました: ${err.message}`);
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
  
  // カメラアイコンSVG
  const CameraIcon = () => (
    <svg className="capture-button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
      <circle cx="12" cy="13" r="4"></circle>
    </svg>
  );
  
  // PCビュー時のレイアウト
  const renderPcLayout = () => {
    return (
      <div className="pc-layout-container">
        {isCapturing ? (
          <div className="camera-container">
            {!isSecureContext && (
              <div className="security-warning">
                <p>セキュリティ上の制限により、HTTPSでの接続が必要です。</p>
                <p>localhostを使用するか、HTTPSで接続してください。</p>
              </div>
            )}
            {showFlash && <div className="camera-flash" />}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
            />
            <button 
              className="capture-button" 
              onClick={captureImage}
              aria-label="撮影"
              disabled={!isSecureContext}
            >
              <CameraIcon />
            </button>
          </div>
        ) : (
          <>
            <div className="preview-container">
              {capturedImage && (
                <img src={capturedImage} alt="メニュー画像" />
              )}
              {isLoading && <div className="loading">解析中...</div>}
            </div>
            
            <div className="recommendation-results">
              {result ? (
                <>
                  <h2>あなたへのおすすめ</h2>
                  <ul>
                    {result.items.map((item, index) => (
                      <li key={index} className="recommendation-item">
                        <h3>{item.name}</h3>
                        <p className="description">{item.description}</p>
                        <p className="reason">{item.reason}</p>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="no-result">
                  {error ? (
                    <div className="error-message">
                      <p>{error}</p>
                    </div>
                  ) : (
                    <p>お酒をおすすめするにはメニューを撮影してください</p>
                  )}
                </div>
              )}
              
              <button 
                className="retake-button" 
                onClick={retakePhoto}
              >
                再撮影
              </button>
            </div>
          </>
        )}
      </div>
    );
  };
  
  // モバイルビュー時のレイアウト
  const renderMobileLayout = () => {
    return (
      <>
        {isCapturing ? (
          <div className="camera-container">
            {!isSecureContext && (
              <div className="security-warning">
                <p>セキュリティ上の制限により、HTTPSでの接続が必要です。</p>
                <p>localhostを使用するか、HTTPSで接続してください。</p>
              </div>
            )}
            {showFlash && <div className="camera-flash" />}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
            />
            <button 
              className="capture-button" 
              onClick={captureImage}
              aria-label="撮影"
              disabled={!isSecureContext}
            >
              <CameraIcon />
            </button>
          </div>
        ) : (
          <div className="result-container">
            {capturedImage && !result && (
              <div className="preview-container">
                <img src={capturedImage} alt="メニュー画像" />
                {isLoading && <div className="loading">解析中...</div>}
              </div>
            )}
            
            {result && (
              <div className="recommendation-results">
                <h2>あなたへのおすすめ</h2>
                <ul>
                  {result.items.map((item, index) => (
                    <li key={index} className="recommendation-item">
                      <h3>{item.name}</h3>
                      <p className="description">{item.description}</p>
                      <p className="reason">{item.reason}</p>
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
      </>
    );
  };
  
  return (
    <div className="app-container">
      <header>
        <h1>SakeLens</h1>
      </header>
      
      <main>
        {isPcView && !isCapturing ? renderPcLayout() : renderMobileLayout()}
      </main>
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default App;