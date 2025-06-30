export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  status: string;
  message: string;
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
  refreshToken?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  userId: string;
  email: string;
}

export interface User {
  id: string;
  email: string;
}

export interface AuthError {
  statusCode: number;
  message: string | string[];
  error: string;
}

export interface ConsentError {
  statusCode: number;
  message: string | string[];
  error: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
  pqc?: boolean;
  algorithm?: string;
  session_id?: string;
  keyId?: string;
}
