import {
  BadRequestException,
  FileTypeValidator,
  ParseFilePipe,
} from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { translateApiMessage } from 'src/shared/helpers/api-i18n';

export const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const CHAT_IMAGE_EXTENSIONS = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const invalidChatImage = () =>
  new BadRequestException(translateApiMessage('errors.chat.invalidImage'));

export const chatImageUploadOptions: MulterOptions = {
  limits: { fileSize: CHAT_IMAGE_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (CHAT_IMAGE_EXTENSIONS.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(invalidChatImage(), false);
  },
};

export const chatImageFilePipe = new ParseFilePipe({
  validators: [new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ })],
  exceptionFactory: invalidChatImage,
});
