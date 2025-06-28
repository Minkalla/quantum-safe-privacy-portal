import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({ type: 'int', default: 0, select: false })
  failedLoginAttempts: number;

  @Column({ type: 'timestamp', nullable: true, select: false })
  lockUntil: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true, select: false })
  refreshTokenHash: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pqcPublicKey: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pqcSigningKey: string | null;

  @Column({ type: 'timestamp', nullable: true })
  pqcKeyGeneratedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  usePQC: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
