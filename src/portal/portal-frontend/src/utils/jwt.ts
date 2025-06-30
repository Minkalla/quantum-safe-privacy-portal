import jwtDecode from 'jwt-decode';
import { JWTPayload } from '../types/auth';

export const decodeJWT = (token: string): JWTPayload | null => {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    return decoded;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
};

export const isTokenExpired = (token: string, bufferSeconds: number = 30): boolean => {
  try {
    const decoded = decodeJWT(token);
    if (!decoded) return true;
    
    const currentTime = Date.now() / 1000;
    return decoded.exp < (currentTime + bufferSeconds);
  } catch (error) {
    return true;
  }
};

export const getTokenExpirationTime = (token: string): Date | null => {
  try {
    const decoded = decodeJWT(token);
    if (!decoded) return null;
    
    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

export const extractUserFromToken = (token: string): { id: string; email: string } | null => {
  try {
    const decoded = decodeJWT(token);
    if (!decoded) return null;
    
    return {
      id: decoded.userId,
      email: decoded.email,
    };
  } catch (error) {
    return null;
  }
};

export const isPQCToken = (token: string): boolean => {
  try {
    const decoded = decodeJWT(token);
    return decoded?.pqc === true;
  } catch (error) {
    return false;
  }
};

export const getTokenAlgorithm = (token: string): string | null => {
  try {
    const decoded = decodeJWT(token);
    return decoded?.algorithm || null;
  } catch (error) {
    return null;
  }
};
