import {
  BadRequestException,
  FileTypeValidator,
  ParseFilePipe,
} from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { translateApiMessage } from 'src/shared/helpers/api-i18n';

export const BOOKING_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const MAX_INITIAL_BOOKING_IMAGES = 3;

export const BOOKING_IMAGE_EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const invalidBookingImage = () =>
  new BadRequestException(translateApiMessage('errors.booking.invalidImage'));

const createImageUploadOptions = (files: number): MulterOptions => ({
  limits: { fileSize: BOOKING_IMAGE_MAX_BYTES, files },
  fileFilter: (_req, file, callback) => {
    if (BOOKING_IMAGE_EXTENSIONS.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(invalidBookingImage(), false);
  },
});

export const bookingSingleImageOptions = createImageUploadOptions(1);
export const bookingInitialImagesOptions = createImageUploadOptions(
  MAX_INITIAL_BOOKING_IMAGES,
);

export const bookingImageFilePipe = new ParseFilePipe({
  validators: [new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ })],
  exceptionFactory: invalidBookingImage,
});

export async function validateUploadedBookingImages(
  files: Express.Multer.File[] | undefined,
): Promise<Express.Multer.File[]> {
  if (!files || files.length === 0) {
    throw invalidBookingImage();
  }

  if (files.length > MAX_INITIAL_BOOKING_IMAGES) {
    throw new BadRequestException(
      translateApiMessage('errors.booking.tooManyInitialImages'),
    );
  }

  for (const file of files) {
    await bookingImageFilePipe.transform(file);
  }

  return files;
}
