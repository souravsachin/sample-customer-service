import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CustomersService } from '../src/services/customers.service';
import { Customer, CustomerStatus } from '../src/models/entities/customer.entity';
import { HashIdService } from '../src/services/hash-id.service';
import { PiiVaultClient } from '../src/services/pii-vault.client';
import { EventPublisherService } from '../src/events/event-publisher.service';

describe('CustomersService', () => {
  let service: CustomersService;
  let customerRepository: jest.Mocked<Repository<Customer>>;
  let hashIdService: jest.Mocked<HashIdService>;
  let piiVaultClient: jest.Mocked<PiiVaultClient>;
  let eventPublisher: jest.Mocked<EventPublisherService>;

  const mockCustomer: Partial<Customer> = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    hashId: 'CUS-A1B2',
    displayName: 'Test Customer',
    emailToken: 'PII-ABCD',
    phoneToken: 'PII-EF01',
    organizationHashId: 'O-92AF',
    status: CustomerStatus.ACTIVE,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(Customer),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: HashIdService,
          useValue: { generate: jest.fn() },
        },
        {
          provide: PiiVaultClient,
          useValue: {
            tokenize: jest.fn(),
            detokenize: jest.fn(),
          },
        },
        {
          provide: EventPublisherService,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    customerRepository = module.get(getRepositoryToken(Customer)) as jest.Mocked<Repository<Customer>>;
    hashIdService = module.get(HashIdService) as jest.Mocked<HashIdService>;
    piiVaultClient = module.get(PiiVaultClient) as jest.Mocked<PiiVaultClient>;
    eventPublisher = module.get(EventPublisherService) as jest.Mocked<EventPublisherService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return customers filtered by organization (namespace isolation)', async () => {
      customerRepository.find.mockResolvedValue([mockCustomer as Customer]);

      const result = await service.findAll('O-92AF');

      expect(customerRepository.find).toHaveBeenCalledWith({
        where: { organizationHashId: 'O-92AF' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].hashId).toBe('CUS-A1B2');
      // Should not include PII tokens in list response
      expect(result[0]).not.toHaveProperty('email');
      expect(result[0]).not.toHaveProperty('phone');
    });

    it('should return empty array for organization with no customers', async () => {
      customerRepository.find.mockResolvedValue([]);

      const result = await service.findAll('O-0000');

      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return a customer by hashId and org', async () => {
      customerRepository.findOne.mockResolvedValue(mockCustomer as Customer);

      const result = await service.findOne('O-92AF', 'CUS-A1B2');

      expect(result.hashId).toBe('CUS-A1B2');
      expect(result.displayName).toBe('Test Customer');
      // Without detokenize privilege, no PII should be returned
      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
    });

    it('should detokenize PII when caller has privilege', async () => {
      customerRepository.findOne.mockResolvedValue(mockCustomer as Customer);
      piiVaultClient.detokenize
        .mockResolvedValueOnce('test@example.com')
        .mockResolvedValueOnce('+1234567890');

      const result = await service.findOne('O-92AF', 'CUS-A1B2', true);

      expect(piiVaultClient.detokenize).toHaveBeenCalledWith('PII-ABCD');
      expect(piiVaultClient.detokenize).toHaveBeenCalledWith('PII-EF01');
      expect(result.email).toBe('test@example.com');
      expect(result.phone).toBe('+1234567890');
    });

    it('should throw NotFoundException if customer not found', async () => {
      customerRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('O-92AF', 'CUS-0000')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should enforce namespace isolation (customer in different org not found)', async () => {
      customerRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('O-XXXX', 'CUS-A1B2')).rejects.toThrow(
        NotFoundException,
      );
      expect(customerRepository.findOne).toHaveBeenCalledWith({
        where: { hashId: 'CUS-A1B2', organizationHashId: 'O-XXXX' },
      });
    });
  });

  describe('create', () => {
    it('should tokenize PII, create customer, and publish event', async () => {
      hashIdService.generate.mockReturnValue('CUS-NEW1');
      piiVaultClient.tokenize
        .mockResolvedValueOnce('PII-EMAIL1')
        .mockResolvedValueOnce('PII-PHONE1');
      customerRepository.create.mockReturnValue({
        ...mockCustomer,
        hashId: 'CUS-NEW1',
        emailToken: 'PII-EMAIL1',
        phoneToken: 'PII-PHONE1',
      } as Customer);
      customerRepository.save.mockResolvedValue({
        ...mockCustomer,
        hashId: 'CUS-NEW1',
        emailToken: 'PII-EMAIL1',
        phoneToken: 'PII-PHONE1',
      } as Customer);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.create('O-92AF', {
        displayName: 'New Customer',
        email: 'new@example.com',
        phone: '+1234567890',
      });

      // Verify PII was tokenized
      expect(piiVaultClient.tokenize).toHaveBeenCalledWith('email', 'new@example.com');
      expect(piiVaultClient.tokenize).toHaveBeenCalledWith('phone', '+1234567890');

      // Verify hash ID was generated with CUS prefix
      expect(hashIdService.generate).toHaveBeenCalledWith('CUS');

      // Verify event was published
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'customer.customer.created',
        'O',
        'O-92AF',
        expect.objectContaining({ customerHashId: 'CUS-NEW1' }),
      );

      expect(result.hashId).toBe('CUS-NEW1');
    });

    it('should handle customer creation without phone', async () => {
      hashIdService.generate.mockReturnValue('CUS-NEW2');
      piiVaultClient.tokenize.mockResolvedValueOnce('PII-EMAIL2');
      customerRepository.create.mockReturnValue({
        ...mockCustomer,
        hashId: 'CUS-NEW2',
        emailToken: 'PII-EMAIL2',
        phoneToken: null,
      } as Customer);
      customerRepository.save.mockResolvedValue({
        ...mockCustomer,
        hashId: 'CUS-NEW2',
        emailToken: 'PII-EMAIL2',
        phoneToken: null,
      } as Customer);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.create('O-92AF', {
        displayName: 'No Phone Customer',
        email: 'nophone@example.com',
      });

      // Only email should be tokenized, not phone
      expect(piiVaultClient.tokenize).toHaveBeenCalledTimes(1);
      expect(piiVaultClient.tokenize).toHaveBeenCalledWith('email', 'nophone@example.com');
      expect(result.hashId).toBe('CUS-NEW2');
    });
  });

  describe('update', () => {
    it('should re-tokenize PII when email changes', async () => {
      customerRepository.findOne.mockResolvedValue({ ...mockCustomer } as Customer);
      piiVaultClient.tokenize.mockResolvedValueOnce('PII-NEWEMAIL');
      customerRepository.save.mockResolvedValue({
        ...mockCustomer,
        emailToken: 'PII-NEWEMAIL',
      } as Customer);
      eventPublisher.publish.mockResolvedValue(undefined);

      await service.update('O-92AF', 'CUS-A1B2', {
        email: 'updated@example.com',
      });

      expect(piiVaultClient.tokenize).toHaveBeenCalledWith('email', 'updated@example.com');
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'customer.customer.updated',
        'O',
        'O-92AF',
        expect.objectContaining({ customerHashId: 'CUS-A1B2' }),
      );
    });

    it('should update non-PII fields without calling vault', async () => {
      customerRepository.findOne.mockResolvedValue({ ...mockCustomer } as Customer);
      customerRepository.save.mockResolvedValue({
        ...mockCustomer,
        displayName: 'Updated Name',
      } as Customer);
      eventPublisher.publish.mockResolvedValue(undefined);

      await service.update('O-92AF', 'CUS-A1B2', {
        displayName: 'Updated Name',
      });

      expect(piiVaultClient.tokenize).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if customer not found', async () => {
      customerRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('O-92AF', 'CUS-0000', { displayName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove customer and publish event', async () => {
      customerRepository.findOne.mockResolvedValue(mockCustomer as Customer);
      customerRepository.remove.mockResolvedValue(mockCustomer as Customer);
      eventPublisher.publish.mockResolvedValue(undefined);

      await service.remove('O-92AF', 'CUS-A1B2');

      expect(customerRepository.remove).toHaveBeenCalled();
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'customer.customer.deleted',
        'O',
        'O-92AF',
        { customerHashId: 'CUS-A1B2' },
      );
    });

    it('should throw NotFoundException if customer not in org', async () => {
      customerRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('O-92AF', 'CUS-0000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
