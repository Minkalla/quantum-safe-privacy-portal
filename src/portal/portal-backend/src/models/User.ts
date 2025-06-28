/**
 * @file User.ts
 * @description TypeORM entity definition for the User entity in the Quantum-Safe Privacy Portal Backend.
 * This entity defines the structure for storing user authentication credentials and basic profile information,
 * including fields for enhanced login security and authentication management.
 *
 * @module UserModel
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Adheres to "no regrets" quality by enforcing strict schema validation and typing.
 * Integrates fields for brute-force protection and refresh token management to support a dual-token
 * authentication strategy. Future enhancements will include integration with QynAuth for post-quantum
 * public keys, and ensuring compliance with data privacy regulations (e.g., GDPR, HIPAA).
 *
 * @property {string} email - The user's unique email address, used for login. Required and must be unique.
 * @property {string} password - The user's hashed password. Required.
 * @property {Date} createdAt - Timestamp of user creation.
 * @property {Date} updatedAt - Timestamp of last user update.
 * @property {Date | null} [lastLoginAt] - Timestamp of the user's last successful login, or null.
 * @property {number | null} [failedLoginAttempts] - Counter for consecutive failed login attempts, or null.
 * @property {Date | null} [lockUntil] - Timestamp indicating when the account will be unlocked, or null.
 * @property {string | null} [refreshTokenHash] - Hashed version of the refresh token, or null.
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * TypeORM entity for user records with comprehensive authentication features.
 *
 * Features:
 * - Unique email constraint with validation
 * - Brute-force protection with failed attempts and lockout
 * - Refresh token management for dual-token strategy
 * - PQC key storage for quantum-safe authentication
 * - Automatic timestamp management
 */
@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
    id!: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    transformer: {
      to: (value: string) => value?.toLowerCase()?.trim(),
      from: (value: string) => value,
    },
  })
  @Index()
    email!: string;

  @Column({ type: 'varchar', length: 255 })
    password!: string;

  @Column({ type: 'timestamp', nullable: true, default: null })
    lastLoginAt?: Date | null;

  @Column({ type: 'int', default: 0 })
    failedLoginAttempts!: number;

  @Column({ type: 'timestamp', nullable: true, default: null })
    lockUntil?: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null, select: false })
    refreshTokenHash?: string | null;

  @Column({ type: 'text', nullable: true, default: null, select: false })
    pqcPublicKey?: string | null;

  @Column({ type: 'text', nullable: true, default: null, select: false })
    pqcSigningKey?: string | null;

  @Column({ type: 'timestamp', nullable: true, default: null })
    pqcKeyGeneratedAt?: Date | null;

  @Column({ type: 'boolean', default: false })
    usePQC!: boolean;

  @CreateDateColumn()
    createdAt!: Date;

  @UpdateDateColumn()
    updatedAt!: Date;
}

/**
 * TypeScript interface for User entities.
 * Provides type safety for database operations.
 */
export interface IUser {
  /** Unique identifier for the user record */
  id: string;

  /** Unique email address for login */
  email: string;

  /** Hashed password */
  password: string;

  /** Timestamp of last successful login */
  lastLoginAt?: Date | null;

  /** Counter for consecutive failed login attempts */
  failedLoginAttempts: number;

  /** Timestamp when account will be unlocked */
  lockUntil?: Date | null;

  /** Hashed refresh token for dual-token strategy */
  refreshTokenHash?: string | null;

  /** PQC public key for Kyber-768 KEM */
  pqcPublicKey?: string | null;

  /** PQC signing key for Dilithium-3 */
  pqcSigningKey?: string | null;

  /** Timestamp of PQC key generation */
  pqcKeyGeneratedAt?: Date | null;

  /** Flag indicating if user is enrolled in PQC */
  usePQC: boolean;

  /** Timestamp when the user record was created */
  createdAt: Date;

  /** Timestamp when the user record was last updated */
  updatedAt: Date;
}
