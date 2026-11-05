import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({
    description:
      'Loại tài liệu (ID_CARD_FRONT, ID_CARD_BACK, CERTIFICATE, TOOLKIT_PHOTO, OTHER)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  documentType: string;

  @ApiProperty({ description: 'Đường dẫn tệp' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;
}

