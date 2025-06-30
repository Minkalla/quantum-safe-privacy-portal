export enum ConsentType {
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  DATA_PROCESSING = 'data_processing',
  COOKIES = 'cookies',
  THIRD_PARTY_SHARING = 'third_party_sharing',
}

export interface CreateConsentRequest {
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConsentRecord {
  consentId: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentError {
  statusCode: number;
  message: string | string[];
  error: string;
}

export interface ConsentState {
  [ConsentType.MARKETING]: boolean;
  [ConsentType.ANALYTICS]: boolean;
  [ConsentType.DATA_PROCESSING]: boolean;
  [ConsentType.COOKIES]: boolean;
  [ConsentType.THIRD_PARTY_SHARING]: boolean;
}
