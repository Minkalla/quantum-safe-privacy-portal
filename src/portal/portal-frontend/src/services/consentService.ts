import { AxiosError } from 'axios';
import apiClient, { handleApiError } from '../utils/api';
import { CreateConsentRequest, ConsentRecord, ConsentError } from '../types/consent';

export class ConsentService {
  async createConsent(consentData: CreateConsentRequest): Promise<ConsentRecord> {
    try {
      const response = await apiClient.post<ConsentRecord>('/consent', consentData);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError) as ConsentError;
    }
  }

  async getConsentByUserId(userId: string): Promise<ConsentRecord[]> {
    try {
      const response = await apiClient.get<ConsentRecord[]>(`/consent/${userId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError) as ConsentError;
    }
  }

  async updateConsent(consentData: CreateConsentRequest): Promise<ConsentRecord> {
    try {
      const response = await apiClient.put<ConsentRecord>('/consent', consentData);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError) as ConsentError;
    }
  }
}

export const consentService = new ConsentService();
