/**
 * @file User.ts
 * @description Mongoose schema and model definition for the User entity in the Quantum-Safe Privacy Portal Backend.
 * This schema defines the structure for storing user authentication credentials and basic profile information,
 * including fields for enhanced login security and session management.
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
 *
 * @see {@link https://mongoosejs.com/docs/guide.html|Mongoose Documentation}
 */

import { Schema, model, Document, Model } from 'mongoose'; // MODIFIED: Added 'Model' import for clarity

/**
 * @interface IUser
 * @description Defines the TypeScript interface for a User document,
 * ensuring type safety when interacting with the User model.
 * Extends Mongoose's Document interface to include Mongoose-specific properties like _id.
 * MODIFIED: Added new fields and explicitly allowed 'null' for nullable properties.
 */
export interface IUser extends Document {
  email: string;
  password: string;
  lastLoginAt?: Date | null; // MODIFIED: Allowed null
  failedLoginAttempts?: number | null; // MODIFIED: Allowed null
  lockUntil?: Date | null; // MODIFIED: Allowed null
  refreshTokenHash?: string | null; // MODIFIED: Allowed null
  // Future: PQC public keys, consent links, etc.
}

/**
 * @constant {Schema<IUser>} UserSchema
 * @description Defines the Mongoose schema for the User model.
 * Sets up field types, validation, and schema options.
 * MODIFIED: Added new fields to the schema.
 */
export const UserSchema = new Schema<IUser>( // MODIFIED: Added 'export' here
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      // In a real application, we would never store plain passwords.
      // Hashing will be implemented in the controller logic.
    },
    lastLoginAt: {
      type: Date,
      default: null, // MODIFIED: Default to null or undefined
    },
    failedLoginAttempts: {
      type: Number,
      default: 0, // MODIFIED: Default to 0 failed attempts
    },
    lockUntil: {
      type: Date,
      default: null, // MODIFIED: Default to null, meaning not locked
    },
    refreshTokenHash: {
      type: String,
      default: null, // MODIFIED: Default to null
      select: false, // MODIFIED: Do not return by default on queries
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
    collection: 'users', // Explicitly name the collection
  },
);

/**
 * @constant {Model<IUser>} User
 * @description Exports the Mongoose User model, making it available for database operations.
 */
const User: Model<IUser> = model<IUser>('User', UserSchema); // MODIFIED: Explicitly typed the exported model

export default User;
