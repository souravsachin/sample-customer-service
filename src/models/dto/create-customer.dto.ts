import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO for creating a customer.
 * Raw PII (email, phone) comes in here and gets tokenized via
 * the PII Vault before storage.
 */
export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
