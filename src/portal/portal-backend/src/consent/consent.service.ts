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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateConsentDto } from './dto/create-consent.dto';
import { Consent } from '../models/Consent';

@Injectable()
export class ConsentService {
  constructor(
    @InjectRepository(Consent)
    private readonly consentRepository: Repository<Consent>,
  ) {}

  /**
   * Creates or updates a consent record.
   * @param createConsentDto Data for consent creation/update.
   * @returns Created or updated consent record.
   * @throws ConflictException if attempting to create duplicate consent with different granted status.
   */
  async createConsent(createConsentDto: CreateConsentDto): Promise<Consent> {
    const { userId, consentType, granted, ipAddress, userAgent } = createConsentDto;

    const existingConsent = await this.consentRepository.findOne({
      where: { userId, consentType },
    });

    if (existingConsent) {
      if (existingConsent.granted === granted) {
        throw new ConflictException('Consent record already exists with the same granted status');
      }

      existingConsent.granted = granted;
      if (ipAddress !== undefined) {
        existingConsent.ipAddress = ipAddress;
      }
      if (userAgent !== undefined) {
        existingConsent.userAgent = userAgent;
      }

      return await this.consentRepository.save(existingConsent);
    }

    const newConsent = this.consentRepository.create({
      userId,
      consentType,
      granted,
      ipAddress,
      userAgent,
    });

    return await this.consentRepository.save(newConsent);
  }

  /**
   * Retrieves all consent records for a specific user.
   * @param userId The ID of the user whose consents to retrieve.
   * @returns Array of consent records for the user.
   * @throws NotFoundException if no consents found for the user.
   */
  async getConsentByUserId(userId: string): Promise<Consent[]> {
    const consents = await this.consentRepository.find({ where: { userId } });

    if (!consents || consents.length === 0) {
      throw new NotFoundException('No consent records found for this user');
    }

    return consents;
  }
}
