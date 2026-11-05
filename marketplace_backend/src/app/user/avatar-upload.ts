import {
  BadRequestException,
  FileTypeValidator,
  ParseFilePipe,
} from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { translateApiMessage } from 'src/shared/helpers/api-i18n';

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const AVATAR_EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
]);

const invalidAvatar = () =>
  new BadRequestException(translateApiMessage('errors.user.invalidAvatar'));

export const avatarUploadOptions: MulterOptions = {
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (AVATAR_EXTENSIONS.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(invalidAvatar(), false);
  },
};

// fileFilter chỉ thấy MIME do client khai báo, còn validator này đọc nội dung thật của file
export const avatarFilePipe = new ParseFilePipe({
  validators: [new FileTypeValidator({ fileType: /^image\/(jpeg|png)$/ })],
  exceptionFactory: invalidAvatar,
});
