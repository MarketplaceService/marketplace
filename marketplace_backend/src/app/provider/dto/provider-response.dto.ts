import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { VerificationStatus } from 'src/shared/types/verification-status.enum';

export class ProviderDocumentResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  providerId: string;

  @ApiProperty()
  @Expose()
  documentType: string;

  @ApiProperty()
  @Expose()
  fileUrl: string;

  @ApiProperty({ enum: VerificationStatus })
  @Expose()
  status: VerificationStatus;

  @ApiProperty()
  @Expose()
  createdAt: Date;
}

export class ProviderServiceAreaResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  providerId: string;

  @ApiPropertyOptional()
  @Expose()
  areaName?: string | null;

  @ApiProperty()
  @Expose()
  centerLatitude: number;

  @ApiProperty()
  @Expose()
  centerLongitude: number;

  @ApiProperty()
  @Expose()
  radiusKm: number;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiProperty()
  @Expose()
  createdAt: Date;
}

export class ProviderProfileResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  userId: string;

  @ApiProperty()
  @Expose()
  displayName: string;

  @ApiPropertyOptional()
  @Expose()
  bio?: string | null;

  @ApiPropertyOptional()
  @Expose()
  experienceYears?: number | null;

  @ApiPropertyOptional()
  @Expose()
  phone?: string | null;

  @ApiPropertyOptional()
  @Expose()
  categoryId?: string | null;

  @ApiProperty({ enum: VerificationStatus })
  @Expose()
  verificationStatus: VerificationStatus;

  @ApiPropertyOptional()
  @Expose()
  approvedBy?: string | null;

  @ApiPropertyOptional()
  @Expose()
  approvedAt?: Date | null;

  @ApiPropertyOptional()
  @Expose()
  rejectionReason?: string | null;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({ type: () => [ProviderDocumentResponseDto] })
  @Expose()
  @Type(() => ProviderDocumentResponseDto)
  documents?: ProviderDocumentResponseDto[];

  @ApiPropertyOptional({ type: () => [ProviderServiceAreaResponseDto] })
  @Expose()
  @Type(() => ProviderServiceAreaResponseDto)
  serviceAreas?: ProviderServiceAreaResponseDto[];
}

