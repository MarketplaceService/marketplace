import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingTables1795270100000 implements MigrationInterface {
  name = 'CreateBookingTables1795270100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    await queryRunner.query(
      `CREATE TYPE "public"."booking_status" AS ENUM('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED')`,
    );

    await queryRunner.query(
      `CREATE TABLE "booking" (
        "id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "booking_code" character varying(30) NOT NULL,
        "customer_id" uuid NOT NULL,
        "provider_id" uuid NOT NULL,
        "service_id" uuid NOT NULL,
        "address_id" uuid NOT NULL,
        "scheduled_start_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "scheduled_end_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "total_price" numeric(18,2) NOT NULL,
        "service_title_snapshot" character varying(200) NOT NULL,
        "service_address_snapshot" jsonb NOT NULL,
        "inspection_images" jsonb,
        "customer_note" text,
        "status" "public"."booking_status" NOT NULL DEFAULT 'PENDING',
        "cancelled_by" uuid,
        "cancel_reason" text,
        CONSTRAINT "UQ_booking_code" UNIQUE ("booking_code"),
        CONSTRAINT "chk_booking_schedule_price" CHECK (scheduled_end_at > scheduled_start_at AND total_price >= 0),
        CONSTRAINT "PK_booking" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "booking" ADD CONSTRAINT "FK_booking_customer" FOREIGN KEY ("customer_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "booking" ADD CONSTRAINT "FK_booking_provider" FOREIGN KEY ("provider_id") REFERENCES "provider_profile"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "booking" ADD CONSTRAINT "FK_booking_provider_service" FOREIGN KEY ("provider_id", "service_id") REFERENCES "service"("provider_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "booking" ADD CONSTRAINT "FK_booking_address" FOREIGN KEY ("address_id") REFERENCES "address"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "booking" ADD CONSTRAINT "FK_booking_cancelled_by" FOREIGN KEY ("cancelled_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_booking_customer_recent" ON "booking" ("customer_id", "created_at" DESC)`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_booking_provider_schedule" ON "booking" ("provider_id", "scheduled_start_at")`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_booking_provider_recent" ON "booking" ("provider_id", "created_at" DESC)`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_booking_service" ON "booking" ("service_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_booking_address" ON "booking" ("address_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_booking_provider_open" ON "booking" ("provider_id", "scheduled_start_at", "id") WHERE "status" IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS')`,
    );

    await queryRunner.query(
      `ALTER TABLE "booking"
       ADD CONSTRAINT "excl_booking_provider_slot_active"
       EXCLUDE USING gist (
         "provider_id" WITH =,
         tstzrange("scheduled_start_at", "scheduled_end_at", '[)') WITH &&
       )
       WHERE ("status" IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS'))`,
    );

    await queryRunner.query(
      `CREATE TABLE "booking_status_history" (
        "id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "booking_id" uuid NOT NULL,
        "old_status" "public"."booking_status",
        "new_status" "public"."booking_status" NOT NULL,
        "changed_by" uuid,
        "reason" text,
        CONSTRAINT "PK_booking_status_history" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "booking_status_history" ADD CONSTRAINT "FK_booking_status_history_booking" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "booking_status_history" ADD CONSTRAINT "FK_booking_status_history_changed_by" FOREIGN KEY ("changed_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_booking_status_timeline" ON "booking_status_history" ("booking_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_booking_status_timeline"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_status_history" DROP CONSTRAINT IF EXISTS "FK_booking_status_history_changed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_status_history" DROP CONSTRAINT IF EXISTS "FK_booking_status_history_booking"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_status_history"`);

    await queryRunner.query(
      `ALTER TABLE "booking" DROP CONSTRAINT IF EXISTS "excl_booking_provider_slot_active"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_booking_provider_open"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_booking_address"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_booking_service"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_booking_provider_recent"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_booking_provider_schedule"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_booking_customer_recent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking" DROP CONSTRAINT IF EXISTS "FK_booking_cancelled_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking" DROP CONSTRAINT IF EXISTS "FK_booking_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking" DROP CONSTRAINT IF EXISTS "FK_booking_provider_service"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking" DROP CONSTRAINT IF EXISTS "FK_booking_provider"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking" DROP CONSTRAINT IF EXISTS "FK_booking_customer"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "booking"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."booking_status"`);
  }
}
