import { Injectable, OnModuleInit } from '@nestjs/common';
import { OpenAIService } from './ai/openai.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private readonly openAIService: OpenAIService) {}

  async onModuleInit() {
    await this.openAIService.testOpenAI();
  }

  getHello(): string {
    return 'Hello World!';
  }
}
