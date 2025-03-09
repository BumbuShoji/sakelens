// src/types.ts
export interface OcrResult {
    text: string;
  }
  
  export interface RecommendationItem {
    name: string;
    description: string;
    reason: string;
  }
  
  export interface RecommendResult {
    recommendations: RecommendationItem[];
  }
  
  export interface FormattedResult {
    items: RecommendationItem[];
  }
  
  export interface ApiResponse {
    success: boolean;
    result: FormattedResult;
  }