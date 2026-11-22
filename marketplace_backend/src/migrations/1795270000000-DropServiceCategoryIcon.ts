import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropServiceCategoryIcon1795270000000 implements MigrationInterface {
  name = 'DropServiceCategoryIcon1795270000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_category" DROP COLUMN IF EXISTS "icon"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_category" ADD COLUMN IF NOT EXISTS "icon" text`,
    );
  }
}
