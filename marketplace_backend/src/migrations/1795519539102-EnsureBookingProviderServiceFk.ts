import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Composite FK ties the booked provider to the actual service owner.
 * Ref: booking.(provider_id, service_id) > service.(provider_id, id)
 *
 * CreateBookingTables đã tạo FK này, nhưng database nào từng chạy một bản CreateBookingTables cũ
 * (chưa có FK, cùng tên migration nên không chạy lại) sẽ thiếu nó. Migration này chỉ tạo phần còn
 * thiếu, nên chạy trên database đã đủ thì không đổi gì.
 */
export class EnsureBookingProviderServiceFk1795519539102 implements MigrationInterface {
  name = 'EnsureBookingProviderServiceFk1795519539102';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Đích của FK phải là unique constraint. Nếu đang có unique index cùng tên (sinh từ @Index cũ)
    // thì nâng index đó thành constraint thay vì tạo trùng tên
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'uq_service_provider_id' AND conrelid = 'service'::regclass
        ) THEN
          IF EXISTS (
            SELECT 1 FROM pg_class WHERE relname = 'uq_service_provider_id' AND relkind = 'i'
          ) THEN
            ALTER TABLE "service" ADD CONSTRAINT "uq_service_provider_id" UNIQUE USING INDEX "uq_service_provider_id";
          ELSE
            ALTER TABLE "service" ADD CONSTRAINT "uq_service_provider_id" UNIQUE ("provider_id", "id");
          END IF;
        END IF;
      END $$;
    `);

    const [{ exists }] = (await queryRunner.query(
      `SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FK_booking_provider_service' AND conrelid = 'booking'::regclass
      ) AS "exists"`,
    )) as Array<{ exists: boolean }>;
    if (exists) return;

    // Báo rõ đơn nào sai thay vì để Postgres trả lỗi FK chung chung
    const mismatched = (await queryRunner.query(
      `SELECT b.booking_code AS "bookingCode"
       FROM "booking" b
       LEFT JOIN "service" s ON s.id = b.service_id AND s.provider_id = b.provider_id
       WHERE s.id IS NULL
       LIMIT 20`,
    )) as Array<{ bookingCode: string }>;
    if (mismatched.length > 0) {
      throw new Error(
        `Có đơn mà provider_id không phải chủ của service_id, hãy sửa trước khi chạy lại: ${mismatched
          .map((row) => row.bookingCode)
          .join(', ')}`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE "booking" ADD CONSTRAINT "FK_booking_provider_service" FOREIGN KEY ("provider_id", "service_id") REFERENCES "service"("provider_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(): Promise<void> {
    // Không xóa gì: FK và unique constraint thuộc về CreateBookingTables, xóa ở đây sẽ làm
    // database đã đủ từ trước mất ràng buộc khi revert
  }
}
