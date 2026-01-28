
export interface Location {
  lat: number;
  lng: number;
}

export interface CafeInfo {
  id: string;
  name: string;
  address: string;
  smokingStatus: 'allowed' | 'partially' | 'prohibited' | 'unknown';
  description: string;
  mapUrl?: string;
  rating?: string;
  reviewSnippet?: string;
}

export enum FilterType {
  ALL = 'ALL',
  SMOKING_ALLOWED = 'SMOKING_ALLOWED',
}

export type SmokingType = '店内喫煙可' | '喫煙室あり' | '屋外・テラスのみ' | '不明';

export type EstablishmentCategory = '飲食店すべて' | 'カフェ' | '居酒屋' | 'ラーメン' | '焼肉' | 'バー' | '和食' | '洋食';
