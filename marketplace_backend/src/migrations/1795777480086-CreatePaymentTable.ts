import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentTable1795777480086 implements MigrationInterface {
  name = 'CreatePaymentTable1795777480086';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."payment_method_enum" AS ENUM('cod', 'bank_transfer', 'payos', 'vnpay', 'momo', 'zalopay')`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."payment_status_detail_enum" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'expired', 'refunded')`,
    );

    await queryRunner.query(
      `CREATE TABLE "payment" (
        "id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "booking_id" uuid NOT NULL,
        "payment_method" "public"."payment_method_enum" NOT NULL,
        "amount" numeric(18,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'VND',
        "status" "public"."payment_status_detail_enum" NOT NULL DEFAULT 'pending',
        "transaction_id" character varying(150),
        "payos_order_code" bigint,
        "payment_link_id" character varying(100),
        "payment_link_url" text,
        "payment_details" text,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "paid_at" TIMESTAMP WITH TIME ZONE,
        "refunded_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "uq_payment_transaction_id" UNIQUE ("transaction_id"),
        CONSTRAINT "uq_payment_payos_order_code" UNIQUE ("payos_order_code"),
        CONSTRAINT "uq_payment_link_id" UNIQUE ("payment_link_id"),
        CONSTRAINT "chk_payment_amount_positive" CHECK (amount > 0),
        CONSTRAINT "PK_payment" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "FK_payment_booking" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_payment_booking" ON "payment" ("booking_id", "created_at")`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_payment_status" ON "payment" ("status", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_payment_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_payment_booking"`);
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "FK_payment_booking"`,
    );
    await queryRunner.query(`DROP TABLE "payment"`);
    await queryRunner.query(`DROP TYPE "public"."payment_status_detail_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payment_method_enum"`);
  }
}
