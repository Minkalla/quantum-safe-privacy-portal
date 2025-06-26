import { Module } from '@nestjs/common';
import { DocumentationValidatorService } from './documentation-validator.service';

@Module({
  providers: [DocumentationValidatorService],
  exports: [DocumentationValidatorService],
})
export class QualityModule {}
