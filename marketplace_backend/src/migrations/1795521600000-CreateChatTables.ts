import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatTables1795521600000 implements MigrationInterface {
  name = 'CreateChatTables1795521600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."message_type" AS ENUM('TEXT', 'IMAGE', 'SYSTEM')`,
    );

    await queryRunner.query(
      `CREATE TABLE "conversation" (
        "id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "booking_id" uuid,
        CONSTRAINT "UQ_conversation_booking_id" UNIQUE ("booking_id"),
        CONSTRAINT "PK_conversation" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "conversation" ADD CONSTRAINT "FK_conversation_booking" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "conversation_participant" (
        "id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "conversation_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "last_read_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_conversation_participant" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "conversation_participant" ADD CONSTRAINT "FK_conversation_participant_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "conversation_participant" ADD CONSTRAINT "FK_conversation_participant_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_conversation_participant" ON "conversation_participant" ("conversation_id", "user_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_participant_user_conversation" ON "conversation_participant" ("user_id", "conversation_id")`,
    );

    await queryRunner.query(
      `CREATE TABLE "message" (
        "id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "conversation_id" uuid NOT NULL,
        "sender_id" uuid NOT NULL,
        "message_type" "public"."message_type" NOT NULL DEFAULT 'TEXT',
        "content" text NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_message" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "message" ADD CONSTRAINT "FK_message_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "message" ADD CONSTRAINT "FK_message_sender" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_message_conversation_cursor" ON "message" ("conversation_id", "created_at", "id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_message_conversation_cursor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_message_sender"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_message_conversation"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "message"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_participant_user_conversation"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."uq_conversation_participant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participant" DROP CONSTRAINT IF EXISTS "FK_conversation_participant_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participant" DROP CONSTRAINT IF EXISTS "FK_conversation_participant_conversation"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "conversation_participant"`);

    await queryRunner.query(
      `ALTER TABLE "conversation" DROP CONSTRAINT IF EXISTS "FK_conversation_booking"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "conversation"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "public"."message_type"`);
  }
}
