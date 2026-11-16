import { MigrationInterface, QueryRunner } from 'typeorm';

// Chỉ tạo 2 bảng của lịch làm việc. migration:generate còn sinh thêm các thay đổi
// tên constraint và kiểu enum của module provider; phần đó không thuộc migration này.
export class CreateProviderScheduleTables1794657019928 implements MigrationInterface {
  name = 'CreateProviderScheduleTables1794657019928';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "provider_availability" (
        "id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "provider_id" uuid NOT NULL,
        "day_of_week" smallint NOT NULL,
        "start_time" TIME NOT NULL,
        "end_time" TIME NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "chk_provider_availability_time" CHECK (end_time > start_time),
        CONSTRAINT "chk_provider_availability_day" CHECK (day_of_week BETWEEN 0 AND 6),
        CONSTRAINT "PK_b71cd0a5d4be0a7c6851c51a7b3" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_availability_provider_day" ON "provider_availability" ("provider_id", "day_of_week", "start_time")`,
    );

    await queryRunner.query(
      `CREATE TABLE "provider_time_off" (
        "id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "provider_id" uuid NOT NULL,
        "start_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "reason" text NOT NULL,
        CONSTRAINT "chk_provider_time_off_range" CHECK (end_at > start_at),
        CONSTRAINT "PK_fabceb5782b8e7526293438750e" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_time_off_provider_start" ON "provider_time_off" ("provider_id", "start_at")`,
    );

    await queryRunner.query(
      `ALTER TABLE "provider_availability" ADD CONSTRAINT "FK_provider_availability_provider" FOREIGN KEY ("provider_id") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "provider_time_off" ADD CONSTRAINT "FK_provider_time_off_provider" FOREIGN KEY ("provider_id") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "provider_time_off" DROP CONSTRAINT "FK_provider_time_off_provider"`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_availability" DROP CONSTRAINT "FK_provider_availability_provider"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_time_off_provider_start"`,
    );
    await queryRunner.query(`DROP TABLE "provider_time_off"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_availability_provider_day"`,
    );
    await queryRunner.query(`DROP TABLE "provider_availability"`);
  }
}
