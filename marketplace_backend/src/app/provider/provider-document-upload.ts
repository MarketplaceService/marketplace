import {
  BadRequestException,
  FileTypeValidator,
  ParseFilePipe,
} from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { translateApiMessage } from 'src/shared/helpers/api-i18n';

const PROVIDER_DOCUMENT_MAX_BYTES = 2 * 1024 * 1024;

export const PROVIDER_DOCUMENT_EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['application/pdf', 'pdf'],
]);

const invalidProviderDocument = () =>
  new BadRequestException(
    translateApiMessage('errors.provider.invalidDocument'),
  );

export const providerDocumentUploadOptions: MulterOptions = {
  limits: { fileSize: PROVIDER_DOCUMENT_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (PROVIDER_DOCUMENT_EXTENSIONS.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(invalidProviderDocument(), false);
  },
};

// fileFilter chỉ thấy MIME do client khai báo, validator này kiểm tra nội dung thật của file
export const providerDocumentFilePipe = new ParseFilePipe({
  validators: [
    new FileTypeValidator({
      fileType: /^(image\/(jpeg|png|webp)|application\/pdf)$/,
    }),
  ],
  exceptionFactory: invalidProviderDocument,
});
