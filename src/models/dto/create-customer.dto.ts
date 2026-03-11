import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a customer.
 * Raw PII (email, phone) comes in here and gets tokenized via
 * the PII Vault before storage.
 */
export class CreateCustomerDto {
  @ApiProperty({ description: 'Customer display name', example: 'Jane Smith' })
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @ApiProperty({ description: 'Customer email address (will be tokenized via PII Vault)', example: 'jane@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ description: 'Customer phone number (will be tokenized via PII Vault)', example: '+1-555-0123' })
  @IsString()
  @IsOptional()
  phone?: string;
}
