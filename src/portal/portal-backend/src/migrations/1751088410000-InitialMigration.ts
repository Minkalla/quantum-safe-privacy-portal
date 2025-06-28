import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1751088410000 implements MigrationInterface {
  name = 'InitialMigration1751088410000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "password" character varying(255) NOT NULL,
        "failedLoginAttempts" integer NOT NULL DEFAULT '0',
        "lockUntil" TIMESTAMP,
        "refreshTokenHash" character varying(500),
        "lastLoginAt" TIMESTAMP,
        "pqcPublicKey" character varying(500),
        "pqcSigningKey" character varying(500),
        "pqcKeyGeneratedAt" TIMESTAMP,
        "usePQC" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email")
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."consents_consenttype_enum" AS ENUM(
        'marketing', 
        'analytics', 
        'data_processing', 
        'cookies', 
        'third_party_sharing'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "consents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying(24) NOT NULL,
        "consentType" "public"."consents_consenttype_enum" NOT NULL,
        "granted" boolean NOT NULL,
        "ipAddress" character varying(45),
        "userAgent" character varying(500),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_c8b5c8b7e7b8b8b8b8b8b8b8b8b8" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_consents_userid" ON "consents" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_consents_consenttype" ON "consents" ("consentType")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_consents_userid_consenttype" ON "consents" ("userId", "consentType")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_consents_userid_consenttype"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_consents_consenttype"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_consents_userid"`);
    await queryRunner.query(`DROP TABLE "consents"`);
    await queryRunner.query(`DROP TYPE "public"."consents_consenttype_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
