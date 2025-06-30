import axios from 'axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PQCService {
  async triggerPQCHandshake(userId: string) {
    const payload = {
      user_id: userId,
      kem_algorithm: 'Kyber1024',
      dsa_algorithm: 'Dilithium5',
    };

    try {
      const response = await axios.post('http://localhost:8000/api/handshake', payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      console.log('✅ PQC handshake response:', response.data);
      return response.data;
    } catch (err: any) {
      const reason = err?.response?.data || err?.message || 'Unknown error';
      console.error('❌ PQC handshake failed:', reason);
      throw new Error(`PQC handshake error: ${reason}`);
    }
  }
}
