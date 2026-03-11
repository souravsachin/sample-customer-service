import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { CustomerStatus } from '../entities/customer.entity';

/**
 * DTO for updating a customer.
 * Only supplied fields are updated.
 * PII fields (email, phone) will be re-tokenized via the PII Vault.
 */
export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(CustomerStatus)
  @IsOptional()
  status?: CustomerStatus;
}
