// C:\dev\quantum-safe-privacy-portal\src\portal\portal-backend\src\ai\openai.service.ts

import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY is not configured in the .env file!');
      throw new Error('OpenAI API Key is not configured.');
    }
    this.openai = new OpenAI({ apiKey });
    this.logger.log('OpenAI Service Initialized.');
  }

  async testOpenAI(): Promise<void> {
    const testPrompt = "Explain Post-Quantum Cryptography in one sentence.";
    this.logger.log(`Calling OpenAI with prompt: "${testPrompt}"`);

    try {
      const completion = await this.openai.chat.completions.create({
        messages: [{ role: 'user', content: testPrompt }],
        model: 'gpt-4o', // Or 'gpt-4-turbo'
      });

      const response = completion.choices[0]?.message?.content;
      this.logger.log(`--- OPENAI TEST RESPONSE ---`);
      this.logger.log(response);
      this.logger.log(`--------------------------`);

    } catch (error: any) {
      this.logger.error(`Error calling OpenAI: ${error.message}`, error.stack);
    }
  }
}