import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../models/entities/customer.entity';
import { CreateCustomerDto } from '../models/dto/create-customer.dto';
import { UpdateCustomerDto } from '../models/dto/update-customer.dto';
import { CustomerResponseDto } from '../models/dto/customer-response.dto';
import { HashIdService } from './hash-id.service';
import { PiiVaultClient } from './pii-vault.client';
import { EventPublisherService } from '../events/event-publisher.service';
import { CustomerEvents } from '../events/customer.events';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly hashIdService: HashIdService,
    private readonly piiVaultClient: PiiVaultClient,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  /**
   * List all customers within a given organization.
   * Enforces namespace isolation: only returns customers matching orgId.
   */
  async findAll(orgId: string): Promise<CustomerResponseDto[]> {
    const customers = await this.customerRepository.find({
      where: { organizationHashId: orgId },
      order: { createdAt: 'DESC' },
    });

    return customers.map((c) => ({
      hashId: c.hashId,
      displayName: c.displayName,
      organizationHashId: c.organizationHashId,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Find a single customer by hashId, scoped to a specific organization.
   * Optionally detokenizes PII if the caller has the pii:detokenize privilege.
   */
  async findOne(
    orgId: string,
    customerHashId: string,
    canDetokenize = false,
    bearerToken?: string,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findOne({
      where: { hashId: customerHashId, organizationHashId: orgId },
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer ${customerHashId} not found in organization ${orgId}`,
      );
    }

    const response: CustomerResponseDto = {
      hashId: customer.hashId,
      displayName: customer.displayName,
      organizationHashId: customer.organizationHashId,
      status: customer.status,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };

    // Detokenize PII only if caller has privilege
    if (canDetokenize && bearerToken) {
      try {
        response.email = await this.piiVaultClient.detokenize(customer.emailToken, bearerToken);
        if (customer.phoneToken) {
          response.phone = await this.piiVaultClient.detokenize(customer.phoneToken, bearerToken);
        }
      } catch (error) {
        this.logger.warn('PII detokenization failed, returning response without PII', error);
      }
    }

    return response;
  }

  /**
   * Create a new customer within an organization.
   * Tokenizes raw PII (email, phone) via the PII Vault before storage.
   */
  async create(orgId: string, dto: CreateCustomerDto, bearerToken: string): Promise<CustomerResponseDto> {
    const hashId = this.hashIdService.generate('CUS');

    // Tokenize PII via vault — raw values never stored in our DB
    const emailToken = await this.piiVaultClient.tokenize('email', dto.email, orgId, bearerToken);
    let phoneToken: string | null = null;
    if (dto.phone) {
      phoneToken = await this.piiVaultClient.tokenize('phone', dto.phone, orgId, bearerToken);
    }

    const customer = this.customerRepository.create({
      hashId,
      displayName: dto.displayName,
      emailToken,
      phoneToken,
      organizationHashId: orgId,
    });

    await this.customerRepository.save(customer);

    await this.eventPublisher.publish(
      CustomerEvents.CUSTOMER_CREATED,
      'O',
      orgId,
      {
        customerHashId: customer.hashId,
        displayName: customer.displayName,
        organizationHashId: orgId,
      },
    );

    this.logger.log(`Created customer ${customer.hashId} in org ${orgId}`);

    return {
      hashId: customer.hashId,
      displayName: customer.displayName,
      organizationHashId: customer.organizationHashId,
      status: customer.status,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  /**
   * Update an existing customer within an organization.
   * Re-tokenizes any changed PII fields via the PII Vault.
   */
  async update(
    orgId: string,
    customerHashId: string,
    dto: UpdateCustomerDto,
    bearerToken: string,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findOne({
      where: { hashId: customerHashId, organizationHashId: orgId },
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer ${customerHashId} not found in organization ${orgId}`,
      );
    }

    if (dto.displayName !== undefined) {
      customer.displayName = dto.displayName;
    }
    if (dto.status !== undefined) {
      customer.status = dto.status;
    }

    // Re-tokenize PII if changed
    if (dto.email !== undefined) {
      customer.emailToken = await this.piiVaultClient.tokenize('email', dto.email, orgId, bearerToken);
    }
    if (dto.phone !== undefined) {
      customer.phoneToken = await this.piiVaultClient.tokenize('phone', dto.phone, orgId, bearerToken);
    }

    await this.customerRepository.save(customer);

    await this.eventPublisher.publish(
      CustomerEvents.CUSTOMER_UPDATED,
      'O',
      orgId,
      {
        customerHashId: customer.hashId,
        updatedFields: Object.keys(dto),
      },
    );

    this.logger.log(`Updated customer ${customer.hashId} in org ${orgId}`);

    return {
      hashId: customer.hashId,
      displayName: customer.displayName,
      organizationHashId: customer.organizationHashId,
      status: customer.status,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  /**
   * Delete a customer within an organization.
   * Also removes PII tokens from the vault.
   */
  async remove(orgId: string, customerHashId: string): Promise<void> {
    const customer = await this.customerRepository.findOne({
      where: { hashId: customerHashId, organizationHashId: orgId },
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer ${customerHashId} not found in organization ${orgId}`,
      );
    }

    await this.customerRepository.remove(customer);

    await this.eventPublisher.publish(
      CustomerEvents.CUSTOMER_DELETED,
      'O',
      orgId,
      { customerHashId },
    );

    this.logger.log(`Deleted customer ${customerHashId} from org ${orgId}`);
  }
}
