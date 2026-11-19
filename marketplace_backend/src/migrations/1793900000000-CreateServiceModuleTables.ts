import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateServiceModuleTables1793900000000 implements MigrationInterface {
  name = 'CreateServiceModuleTables1793900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."price_unit" AS ENUM('FIXED', 'HOURLY', 'FROM')`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."service_status" AS ENUM('DRAFT', 'PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE')`,
    );

    await queryRunner.query(
      `CREATE TABLE "service_category" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "parent_id" uuid,
        "name" character varying(100) NOT NULL,
        "slug" character varying(120) NOT NULL,
        "icon" text,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_service_category_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_service_category" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_service_category_parent_id" ON "service_category" ("parent_id")`,
    );

    await queryRunner.query(
      `CREATE TABLE "service" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "provider_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        "title" character varying(200) NOT NULL,
        "description" text NOT NULL,
        "base_price" numeric(18,2) NOT NULL,
        "price_unit" "public"."price_unit" NOT NULL DEFAULT 'FIXED',
        "duration_minutes" integer NOT NULL,
        "status" "public"."service_status" NOT NULL DEFAULT 'PENDING',
        CONSTRAINT "chk_service_price_duration" CHECK (base_price >= 0 AND duration_minutes > 0),
        CONSTRAINT "PK_service" PRIMARY KEY ("id"),
        CONSTRAINT "uq_service_provider_id" UNIQUE ("provider_id", "id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_service_provider_list" ON "service" ("provider_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_service_category_status_date" ON "service" ("category_id", "status", "created_at")`,
    );

    await queryRunner.query(
      `ALTER TABLE "service_category" ADD CONSTRAINT "FK_service_category_parent" FOREIGN KEY ("parent_id") REFERENCES "service_category"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "service" ADD CONSTRAINT "FK_service_provider" FOREIGN KEY ("provider_id") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "service" ADD CONSTRAINT "FK_service_category" FOREIGN KEY ("category_id") REFERENCES "service_category"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "provider_profile" ADD COLUMN IF NOT EXISTS "is_online" boolean NOT NULL DEFAULT true`,
    );

    await queryRunner.query(
      `ALTER TABLE "provider_profile" DROP CONSTRAINT IF EXISTS "FK_provider_profile_approver"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_provider_approved_by"`,
    );

    await queryRunner.query(
      `ALTER TABLE "provider_profile" DROP COLUMN IF EXISTS "approved_by"`,
    );

    await queryRunner.query(
      `ALTER TABLE "provider_profile" DROP COLUMN IF EXISTS "category_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "provider_profile" ADD COLUMN IF NOT EXISTS "category_id" character varying`,
    );

    await queryRunner.query(
      `ALTER TABLE "provider_profile" ADD COLUMN IF NOT EXISTS "approved_by" uuid`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_provider_approved_by" ON "provider_profile" ("approved_by")`,
    );

    await queryRunner.query(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_provider_profile_approver') THEN ALTER TABLE "provider_profile" ADD CONSTRAINT "FK_provider_profile_approver" FOREIGN KEY ("approved_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION; END IF; END $$;`,
    );

    await queryRunner.query(
      `ALTER TABLE "provider_profile" DROP COLUMN IF EXISTS "is_online"`,
    );

    await queryRunner.query(
      `ALTER TABLE "service" DROP CONSTRAINT "FK_service_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service" DROP CONSTRAINT "FK_service_provider"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_category" DROP CONSTRAINT "FK_service_category_parent"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."idx_service_category_status_date"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_service_provider_list"`);
    await queryRunner.query(`DROP TABLE "service"`);

    await queryRunner.query(
      `DROP INDEX "public"."idx_service_category_parent_id"`,
    );
    await queryRunner.query(`DROP TABLE "service_category"`);

    await queryRunner.query(`DROP TYPE "public"."service_status"`);
    await queryRunner.query(`DROP TYPE "public"."price_unit"`);
  }
}
