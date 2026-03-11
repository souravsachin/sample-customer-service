import { CustomerStatus } from '../entities/customer.entity';

/**
 * Response DTO for customer endpoints.
 * Email and phone are only included if the caller has the
 * privilege to detokenize PII (pii:detokenize).
 */
export interface CustomerResponseDto {
  hashId: string;
  displayName: string;
  organizationHashId: string;
  status: CustomerStatus;
  createdAt: Date;
  updatedAt: Date;
  /** Only present if caller has pii:detokenize privilege */
  email?: string;
  /** Only present if caller has pii:detokenize privilege */
  phone?: string;
}
