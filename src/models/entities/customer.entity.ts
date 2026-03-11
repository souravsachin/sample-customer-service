import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Short hash identifier, e.g. CUS-A1B2 */
  @Column({ unique: true, length: 20 })
  @Index()
  hashId!: string;

  @Column({ name: 'display_name', length: 255 })
  displayName!: string;

  /**
   * PII Vault token referencing the customer's email.
   * Raw email is never stored in this database.
   */
  @Column({ name: 'email_token', length: 64 })
  emailToken!: string;

  /**
   * PII Vault token referencing the customer's phone.
   * Raw phone is never stored in this database.
   */
  @Column({ type: 'varchar', name: 'phone_token', length: 64, nullable: true })
  phoneToken!: string | null;

  /** Organization this customer belongs to (short hash, e.g. O-92AF) */
  @Column({ name: 'organization_hash_id', length: 20 })
  @Index()
  organizationHashId!: string;

  @Column({
    type: 'enum',
    enum: CustomerStatus,
    default: CustomerStatus.ACTIVE,
  })
  status!: CustomerStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
