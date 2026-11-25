import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationTable1795270300000 implements MigrationInterface {
  name = 'CreateNotificationTable1795270300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "notification" (
        "id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL,
        "type" character varying(30) NOT NULL,
        "title" character varying(200) NOT NULL,
        "body" text NOT NULL,
        "reference_type" character varying(30),
        "reference_id" uuid,
        "read_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "chk_notification_type" CHECK (type IN ('BOOKING', 'MESSAGE', 'SYSTEM')),
        CONSTRAINT "chk_notification_reference_type" CHECK (reference_type IS NULL OR reference_type IN ('BOOKING', 'CONVERSATION', 'PROVIDER_PROFILE', 'REPORT')),
        CONSTRAINT "PK_notification" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "FK_notification_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_notification_user_feed" ON "notification" ("user_id", "created_at" DESC, "id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_notification_unread_feed" ON "notification" ("user_id", "created_at" DESC, "id") WHERE "read_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_notification_unread_feed"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_notification_user_feed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT IF EXISTS "FK_notification_user"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "notification"`);
  }
}
