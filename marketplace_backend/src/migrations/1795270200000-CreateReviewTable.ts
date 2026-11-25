import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReviewTable1795270200000 implements MigrationInterface {
  name = 'CreateReviewTable1795270200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "review" (
        "id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "booking_id" uuid NOT NULL,
        "rating" integer NOT NULL,
        "price_matched" boolean NOT NULL,
        "comment" text,
        CONSTRAINT "UQ_review_booking" UNIQUE ("booking_id"),
        CONSTRAINT "chk_review_rating" CHECK (rating BETWEEN 1 AND 5),
        CONSTRAINT "PK_review" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "review" ADD CONSTRAINT "FK_review_booking" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_review_created_at" ON "review" ("created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_review_created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "review" DROP CONSTRAINT IF EXISTS "FK_review_booking"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "review"`);
  }
}
