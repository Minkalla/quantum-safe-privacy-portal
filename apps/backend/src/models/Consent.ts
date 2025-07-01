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

import { Schema, model, Document, Model } from 'mongoose';
import { PQCEncryptedField, PQCSignature, PQCDataIntegrity } from './interfaces/pqc-data.interface';

/**
 * @interface IConsent
 * @description Defines the TypeScript interface for a Consent document,
 * ensuring type safety when interacting with the Consent model.
 * Extends Mongoose's Document interface to include Mongoose-specific properties like _id.
 */
export interface IConsent extends Document {
  userId: string;
  consentType: string;
  granted: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
  consentData?: any;
  encryptedConsentData?: PQCEncryptedField;
  consentSignature?: PQCSignature;
  dataIntegrity?: PQCDataIntegrity;
  isPQCProtected?: boolean;
  protectionMode?: 'classical' | 'pqc' | 'hybrid';
  pqcMetadata?: {
    encryptionAlgorithm?: string;
    signingAlgorithm?: string;
    keyId?: string;
    protectionLevel?: 'basic' | 'enhanced' | 'maximum';
  };
  cryptoVersion?: string;
  backupCryptoVersion?: string;
  migrationDate?: Date;
  rollbackDate?: Date;
  cryptoAlgorithm?: string;
}

/**
 * @constant {Schema<IConsent>} ConsentSchema
 * @description Defines the Mongoose schema for the Consent model.
 * Sets up field types, validation, and schema options.
 */
export const ConsentSchema = new Schema<IConsent>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      trim: true,
      index: true,
    },
    consentType: {
      type: String,
      required: [true, 'Consent type is required'],
      trim: true,
      enum: {
        values: ['marketing', 'analytics', 'data_processing', 'cookies', 'third_party_sharing'],
        message: 'Consent type must be one of: marketing, analytics, data_processing, cookies, third_party_sharing',
      },
      index: true,
    },
    granted: {
      type: Boolean,
      required: [true, 'Granted status is required'],
    },
    ipAddress: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v || v === '' || v === undefined || v === null) return true;
          const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
          const ipv6Regex = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/;
          const ipv4MappedV6Regex = /^::ffff:(\d{1,3}\.){3}\d{1,3}$/i;
          const localhostRegex = /^(127\.0\.0\.1|::1|localhost)$/i;
          return ipv4Regex.test(v) || ipv6Regex.test(v) || ipv4MappedV6Regex.test(v) || localhostRegex.test(v);
        },
        message: 'Please provide a valid IP address',
      },
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: [500, 'User agent must not exceed 500 characters'],
    },
    consentData: {
      type: Schema.Types.Mixed,
      default: null,
    },
    encryptedConsentData: {
      encryptedData: { type: String },
      algorithm: { type: String },
      keyId: { type: String },
      nonce: { type: String },
      timestamp: { type: Date },
      metadata: { type: Schema.Types.Mixed },
    },
    consentSignature: {
      signature: { type: String },
      algorithm: { type: String },
      publicKeyHash: { type: String },
      timestamp: { type: Date },
      signedDataHash: { type: String },
    },
    dataIntegrity: {
      hash: { type: String },
      algorithm: { type: String },
      signature: {
        signature: { type: String },
        algorithm: { type: String },
        publicKeyHash: { type: String },
        timestamp: { type: Date },
        signedDataHash: { type: String },
      },
      timestamp: { type: Date },
      validationStatus: {
        type: String,
        enum: ['valid', 'invalid', 'pending'],
        default: 'pending',
      },
      lastValidated: { type: Date },
    },
    isPQCProtected: {
      type: Boolean,
      default: false,
      index: true,
    },
    protectionMode: {
      type: String,
      enum: ['classical', 'pqc', 'hybrid'],
      default: 'classical',
      index: true,
    },
    pqcMetadata: {
      encryptionAlgorithm: { type: String },
      signingAlgorithm: { type: String },
      keyId: { type: String },
      protectionLevel: {
        type: String,
        enum: ['basic', 'enhanced', 'maximum'],
        default: 'basic',
      },
    },
    cryptoVersion: {
      type: String,
      enum: ['placeholder', 'pqc-real', 'classical'],
      default: 'placeholder',
    },
    backupCryptoVersion: {
      type: String,
      enum: ['placeholder', 'pqc-real', 'classical'],
    },
    migrationDate: {
      type: Date,
    },
    rollbackDate: {
      type: Date,
    },
    cryptoAlgorithm: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'consents',
  },
);

ConsentSchema.index({ userId: 1, consentType: 1 }, { unique: true });
ConsentSchema.index({ isPQCProtected: 1, protectionMode: 1 });
ConsentSchema.index({ 'dataIntegrity.validationStatus': 1 });
ConsentSchema.index({ 'pqcMetadata.keyId': 1 });

/**
 * @constant {Model<IConsent>} Consent
 * @description Exports the Mongoose Consent model, making it available for database operations.
 */
const Consent: Model<IConsent> = model<IConsent>('Consent', ConsentSchema);

export default Consent;
