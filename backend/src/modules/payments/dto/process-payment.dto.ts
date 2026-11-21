import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class ProcessPaymentDto {
  @ApiPropertyOptional({
    enum: PaymentProvider,
    default: PaymentProvider.MOCK,
    description: 'Payment provider (MOCK is development-only)',
  })
  @IsEnum(PaymentProvider)
  @IsOptional()
  provider?: PaymentProvider = PaymentProvider.MOCK;

  @ApiPropertyOptional({
    example: 'idem-order-123-attempt-1',
    description: 'Client-supplied idempotency key to prevent duplicate payment processing',
  })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @ApiPropertyOptional({
    enum: ['SUCCEEDED', 'FAILED'],
    default: 'SUCCEEDED',
    description: 'Development mock outcome simulation (MOCK provider only)',
  })
  @IsIn(['SUCCEEDED', 'FAILED'])
  @IsOptional()
  simulateOutcome?: 'SUCCEEDED' | 'FAILED' = 'SUCCEEDED';
}

export class PaymentWebhookDto {
  @ApiProperty({ example: 'd0000000-0000-0000-0000-000000000001' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.MOCK })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiProperty({ example: 'wh-idem-998822' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @ApiProperty({ example: 'MOCK-REF-AABBCC11' })
  @IsString()
  @IsNotEmpty()
  providerReference: string;

  @ApiProperty({ enum: ['SUCCEEDED', 'FAILED'] })
  @IsIn(['SUCCEEDED', 'FAILED'])
  status: 'SUCCEEDED' | 'FAILED';

  @ApiPropertyOptional({ example: 'Insufficient funds' })
  @IsString()
  @IsOptional()
  failureReason?: string;
}
