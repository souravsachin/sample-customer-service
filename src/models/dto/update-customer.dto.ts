import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerStatus } from '../entities/customer.entity';

/**
 * DTO for updating a customer.
 * Only supplied fields are updated.
 * PII fields (email, phone) will be re-tokenized via the PII Vault.
 */
export class UpdateCustomerDto {
  @ApiPropertyOptional({ description: 'Customer display name', example: 'Jane Doe' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Customer email address (will be re-tokenized via PII Vault)', example: 'jane.doe@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Customer phone number (will be re-tokenized via PII Vault)', example: '+1-555-0456' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Customer status', enum: ['active', 'inactive', 'archived'] })
  @IsEnum(CustomerStatus)
  @IsOptional()
  status?: CustomerStatus;
}
