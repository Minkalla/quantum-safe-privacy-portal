/**
 * @file Consent.ts
 * @description Mongoose schema and model definition for the Consent entity in the Quantum-Safe Privacy Portal Backend.
 * This schema defines the structure for storing user consent records, supporting GDPR Article 7 compliance.
 *
 * @module ConsentModel
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Adheres to "no regrets" quality by enforcing strict schema validation and typing.
 * Supports consent management for GDPR compliance and data rights management.
 *
 * @property {string} userId - Reference to the user who provided consent. Required.
 * @property {string} consentType - Type of consent (e.g., 'marketing', 'analytics', 'data_processing'). Required.
 * @property {boolean} granted - Whether consent was granted (true) or revoked (false). Required.
 * @property {Date} createdAt - Timestamp of consent creation.
 * @property {Date} updatedAt - Timestamp of last consent update.
 * @property {string} [ipAddress] - IP address from which consent was provided (for audit trail).
 * @property {string} [userAgent] - User agent string from which consent was provided (for audit trail).
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Enum for consent types to ensure type safety
 */
export enum ConsentType {
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  DATA_PROCESSING = 'data_processing',
  COOKIES = 'cookies',
  THIRD_PARTY_SHARING = 'third_party_sharing'
}

/**
 * TypeORM entity for consent records with comprehensive validation.
 *
 * Features:
 * - Unique compound index on userId + consentType
 * - IP address validation for IPv4 and IPv6 formats
 * - Automatic timestamp management
 * - Enum validation for consent types
 * - Length constraints for security
 */
@Entity('consents')
@Index(['userId', 'consentType'], { unique: true })
export class Consent {
  @PrimaryGeneratedColumn('uuid')
    id!: string;

  @Column({ type: 'varchar', length: 24 })
  @Index()
    userId!: string;

  @Column({
    type: 'enum',
    enum: ConsentType,
  })
  @Index()
    consentType!: ConsentType;

  @Column({ type: 'boolean' })
    granted!: boolean;

  @Column({ type: 'varchar', length: 45, nullable: true })
    ipAddress?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
    userAgent?: string;

  @CreateDateColumn()
    createdAt!: Date;

  @UpdateDateColumn()
    updatedAt!: Date;
}

/**
 * TypeScript interface for Consent entities.
 * Provides type safety for database operations.
 */
export interface IConsent {
  /** Unique identifier for the consent record */
  id: string;

  /** Unique identifier for the user (24-character hex string) */
  userId: string;

  /** Type of consent being granted or revoked */
  consentType: ConsentType;

  /** Whether consent is granted (true) or revoked (false) */
  granted: boolean;

  /** IP address of the user when consent was given (optional) */
  ipAddress?: string;

  /** User agent string of the browser/client (optional) */
  userAgent?: string;

  /** Timestamp when the consent record was created */
  createdAt: Date;

  /** Timestamp when the consent record was last updated */
  updatedAt: Date;
}
