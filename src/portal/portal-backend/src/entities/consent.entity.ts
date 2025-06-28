import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('consents')
@Index(['userId', 'consentType'], { unique: true })
export class ConsentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 24 })
  @Index()
  userId: string;

  @Column({ 
    type: 'enum', 
    enum: ['marketing', 'analytics', 'data_processing', 'cookies', 'third_party_sharing']
  })
  @Index()
  consentType: string;

  @Column({ type: 'boolean' })
  granted: boolean;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
