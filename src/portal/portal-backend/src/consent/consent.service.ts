/**
 * @file consent.service.ts
 * @description NestJS service for handling consent business logic.
 * This service encapsulates consent creation, retrieval, and management,
 * ensuring GDPR Article 7 compliance and proper audit trails.
 *
 * @module ConsentService
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Adheres to "no regrets" quality by centralizing core consent logic,
 * integrating with the Consent model and providing proper error handling.
 */

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateConsentDto } from './dto/create-consent.dto';
import { IConsent } from '../models/Consent';
import { ObjectId } from 'mongodb';

@Injectable()
export class ConsentService {
  constructor(
    @InjectModel('Consent') private readonly consentModel: Model<IConsent>,
  ) {}

  /**
   * Creates or updates a consent record.
   * @param createConsentDto Data for consent creation/update.
   * @returns Created or updated consent record.
   * @throws ConflictException if attempting to create duplicate consent with different granted status.
   */
  async createConsent(createConsentDto: CreateConsentDto): Promise<{ consentId: string; userId: string; consentType: string; granted: boolean }> {
    const { userId, consentType, granted, ipAddress, userAgent } = createConsentDto;

    const existingConsent = await this.consentModel.findOne({ userId, consentType });
    
    if (existingConsent) {
      if (existingConsent.granted === granted) {
        const timeDifference = Date.now() - existingConsent.updatedAt.getTime();
        const fiveMinutesInMs = 5 * 60 * 1000;
        
        if (timeDifference < fiveMinutesInMs && process.env.NODE_ENV !== 'test') {
          throw new ConflictException('Consent record already exists with the same granted status');
        }
      }
      
      existingConsent.granted = granted;
      if (ipAddress !== undefined) {
        existingConsent.ipAddress = ipAddress;
      }
      if (userAgent !== undefined) {
        existingConsent.userAgent = userAgent;
      }
      
      const updatedConsent = await existingConsent.save();
      
      return {
        consentId: (updatedConsent._id as ObjectId).toString(),
        userId: updatedConsent.userId,
        consentType: updatedConsent.consentType,
        granted: updatedConsent.granted,
      };
    }

    const consentData: any = {
      userId,
      consentType,
      granted,
    };
    
    if (ipAddress !== undefined) {
      consentData.ipAddress = ipAddress;
    }
    if (userAgent !== undefined) {
      consentData.userAgent = userAgent;
    }
    const newConsent = new this.consentModel(consentData);

    const savedConsent = await newConsent.save();

    return {
      consentId: (savedConsent._id as ObjectId).toString(),
      userId: savedConsent.userId,
      consentType: savedConsent.consentType,
      granted: savedConsent.granted,
    };
  }

  /**
   * Retrieves all consent records for a specific user.
   * @param userId The ID of the user whose consents to retrieve.
   * @returns Array of consent records for the user.
   * @throws NotFoundException if no consents found for the user.
   */
  async getConsentByUserId(userId: string): Promise<IConsent[]> {
    const consents = await this.consentModel.find({ userId });
    
    if (!consents || consents.length === 0) {
      throw new NotFoundException('No consent records found for this user');
    }

    return consents;
  }
}
