/**
 * @file User.ts
 * @description Mongoose schema and model definition for the User entity in the Quantum-Safe Privacy Portal Backend.
 * This schema defines the structure for storing user authentication credentials and basic profile information.
 *
 * @module UserModel
 * @author Minkalla
 * @license MIT
 *
 * @remarks
 * Adheres to "no regrets" quality by enforcing strict schema validation and typing.
 * Future enhancements will include integration with QynAuth for post-quantum public keys,
 * and ensuring compliance with data privacy regulations (e.g., GDPR, HIPAA) by handling
 * sensitive data appropriately (e.g., password hashing).
 *
 * @property {string} email - The user's unique email address, used for login. Required and must be unique.
 * @property {string} password - The user's hashed password. Required.
 * @property {Date} createdAt - Timestamp of user creation.
 * @property {Date} updatedAt - Timestamp of last user update.
 *
 * @see {@link https://mongoosejs.com/docs/guide.html|Mongoose Documentation}
 */

import { Schema, model, Document } from 'mongoose';

/**
 * @interface IUser
 * @description Defines the TypeScript interface for a User document,
 * ensuring type safety when interacting with the User model.
 * Extends Mongoose's Document interface to include Mongoose-specific properties like _id.
 */
export interface IUser extends Document {
  email: string;
  password: string;
  // Future: PQC public keys, consent links, etc.
}

/**
 * @constant {Schema<IUser>} UserSchema
 * @description Defines the Mongoose schema for the User model.
 * Sets up field types, validation, and schema options.
 */
const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please fill a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      // In a real application, we would never store plain passwords.
      // Hashing will be implemented in the controller logic.
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
const User = model<IUser>('User', UserSchema);

export default User;