import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsAnonymousToUser1793608321894 implements MigrationInterface {
  name = 'AddIsAnonymousToUser1793608321894';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "is_anonymous" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "is_anonymous"`);
  }
}
