import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProviderModuleTables1793814290531
  implements MigrationInterface
{
  name = 'CreateProviderModuleTables1793814290531';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."verification_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );

    await queryRunner.query(
      `CREATE TABLE "provider_profile" (
        "id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL,
        "display_name" character varying(150) NOT NULL,
        "bio" text,
        "experience_years" integer,
        "phone" text,
        "category_id" character varying,
        "verification_status" "public"."verification_status" NOT NULL DEFAULT 'PENDING',
        "approved_by" uuid,
        "approved_at" TIMESTAMP WITH TIME ZONE,
        "rejection_reason" text,
        CONSTRAINT "CHK_provider_profile_experience_years" CHECK (experience_years >= 0),
        CONSTRAINT "PK_provider_profile" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_provider_profile_user_id" UNIQUE ("user_id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_provider_review_queue" ON "provider_profile" ("verification_status", "created_at")`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_provider_approved_by" ON "provider_profile" ("approved_by")`,
    );

    await queryRunner.query(
      `CREATE TABLE "provider_document" (
        "id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "provider_id" uuid NOT NULL,
        "document_type" character varying(30) NOT NULL,
        "file_url" text NOT NULL,
        "status" "public"."verification_status" NOT NULL DEFAULT 'PENDING',
        CONSTRAINT "PK_provider_document" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_provider_document_list" ON "provider_document" ("provider_id")`,
    );

    await queryRunner.query(
      `CREATE TABLE "provider_service_area" (
        "id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "provider_id" uuid NOT NULL,
        "area_name" character varying,
        "center_latitude" numeric(10,7) NOT NULL,
        "center_longitude" numeric(10,7) NOT NULL,
        "radius_km" numeric(6,2) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "CHK_provider_service_area_radius" CHECK (radius_km > 0),
        CONSTRAINT "PK_provider_service_area" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_service_area_provider_active" ON "provider_service_area" ("provider_id", "is_active")`,
    );

    await queryRunner.query(
      `ALTER TABLE "provider_profile" ADD CONSTRAINT "FK_provider_profile_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "provider_profile" ADD CONSTRAINT "FK_provider_profile_approver" FOREIGN KEY ("approved_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "provider_document" ADD CONSTRAINT "FK_provider_document_provider" FOREIGN KEY ("provider_id") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "provider_service_area" ADD CONSTRAINT "FK_provider_service_area_provider" FOREIGN KEY ("provider_id") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "provider_service_area" DROP CONSTRAINT "FK_provider_service_area_provider"`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_document" DROP CONSTRAINT "FK_provider_document_provider"`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_profile" DROP CONSTRAINT "FK_provider_profile_approver"`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_profile" DROP CONSTRAINT "FK_provider_profile_user"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."idx_service_area_provider_active"`,
    );
    await queryRunner.query(`DROP TABLE "provider_service_area"`);

    await queryRunner.query(`DROP INDEX "public"."idx_provider_document_list"`);
    await queryRunner.query(`DROP TABLE "provider_document"`);

    await queryRunner.query(`DROP INDEX "public"."idx_provider_approved_by"`);
    await queryRunner.query(`DROP INDEX "public"."idx_provider_review_queue"`);
    await queryRunner.query(`DROP TABLE "provider_profile"`);

    await queryRunner.query(`DROP TYPE "public"."verification_status"`);
  }
}

