import { Logger } from '@nestjs/common';
import { Model, Document } from 'mongoose';
import { PQCDataEncryptionService } from '../services/pqc-data-encryption.service';
import { FieldEncryptionService } from '../services/field-encryption.service';

export abstract class BasePQCRepository<T extends Document> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly model: Model<T>,
    protected readonly encryptionService: PQCDataEncryptionService,
    protected readonly fieldEncryption: FieldEncryptionService,
    protected readonly options: { encryptedFields?: string[]; autoEncrypt?: boolean } = {},
  ) {}

  async findById(id: string, userId?: string): Promise<T | null> {
    const document = await this.model.findById(id);
    if (!document) return null;

    return await this.processDocumentForRead(document, userId);
  }

  async create(data: Partial<T>, userId?: string): Promise<T> {
    const processedData = await this.processDocumentForWrite(data, userId);
    const document = new this.model(processedData);
    return await document.save();
  }

  protected async processDocumentForRead(document: T, userId?: string): Promise<T> {
    if (this.options.encryptedFields && this.options.encryptedFields.length > 0) {
      const decryptedData = await this.fieldEncryption.decryptFields(
        document.toObject(),
        this.options.encryptedFields,
        userId,
      );
      return decryptedData.decryptedData as T;
    }
    return document;
  }

  protected async processDocumentForWrite(data: any, userId?: string): Promise<any> {
    if (this.options.autoEncrypt && this.options.encryptedFields && this.options.encryptedFields.length > 0) {
      const result = await this.fieldEncryption.encryptFields(
        data,
        this.options.encryptedFields,
        { userId },
      );
      return result.encryptedData;
    }
    return data;
  }
}
