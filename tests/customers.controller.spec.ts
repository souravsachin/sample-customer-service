import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from '../src/controllers/customers.controller';
import { CustomersService } from '../src/services/customers.service';
import { CustomerStatus } from '../src/models/entities/customer.entity';
import { CustomerResponseDto } from '../src/models/dto/customer-response.dto';

describe('CustomersController', () => {
  let controller: CustomersController;
  let customersService: jest.Mocked<CustomersService>;

  const mockResponse: CustomerResponseDto = {
    hashId: 'CUS-A1B2',
    displayName: 'Test Customer',
    organizationHashId: 'O-92AF',
    status: CustomerStatus.ACTIVE,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: CustomersService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
    customersService = module.get(CustomersService) as jest.Mocked<CustomersService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return array of customers for the organization', async () => {
      customersService.findAll.mockResolvedValue([mockResponse]);

      const result = await controller.findAll('O-92AF');

      expect(customersService.findAll).toHaveBeenCalledWith('O-92AF');
      expect(result).toHaveLength(1);
      expect(result[0].hashId).toBe('CUS-A1B2');
    });
  });

  describe('create', () => {
    it('should create a customer and return response', async () => {
      customersService.create.mockResolvedValue(mockResponse);

      const result = await controller.create('O-92AF', {
        displayName: 'Test Customer',
        email: 'test@example.com',
        phone: '+1234567890',
      });

      expect(customersService.create).toHaveBeenCalledWith('O-92AF', {
        displayName: 'Test Customer',
        email: 'test@example.com',
        phone: '+1234567890',
      });
      expect(result.hashId).toBe('CUS-A1B2');
    });
  });

  describe('findOne', () => {
    it('should return customer without PII when no privilege', async () => {
      customersService.findOne.mockResolvedValue(mockResponse);

      const mockReq = { user: { sub: 'U-1234', org: 'O-92AF', type: 'access' as const } };
      const result = await controller.findOne('O-92AF', 'CUS-A1B2', mockReq);

      expect(customersService.findOne).toHaveBeenCalledWith('O-92AF', 'CUS-A1B2', false);
      expect(result.hashId).toBe('CUS-A1B2');
    });

    it('should pass canDetokenize=true when user has pii:detokenize privilege', async () => {
      const responseWithPii: CustomerResponseDto = {
        ...mockResponse,
        email: 'test@example.com',
        phone: '+1234567890',
      };
      customersService.findOne.mockResolvedValue(responseWithPii);

      const mockReq = {
        user: {
          sub: 'U-1234',
          org: 'O-92AF',
          type: 'access' as const,
          privileges: ['pii:detokenize'],
        },
      };
      const result = await controller.findOne('O-92AF', 'CUS-A1B2', mockReq);

      expect(customersService.findOne).toHaveBeenCalledWith('O-92AF', 'CUS-A1B2', true);
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('update', () => {
    it('should update a customer', async () => {
      const updated = { ...mockResponse, displayName: 'Updated' };
      customersService.update.mockResolvedValue(updated);

      const result = await controller.update('O-92AF', 'CUS-A1B2', {
        displayName: 'Updated',
      });

      expect(customersService.update).toHaveBeenCalledWith('O-92AF', 'CUS-A1B2', {
        displayName: 'Updated',
      });
      expect(result.displayName).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should delete a customer', async () => {
      customersService.remove.mockResolvedValue(undefined);

      await controller.remove('O-92AF', 'CUS-A1B2');

      expect(customersService.remove).toHaveBeenCalledWith('O-92AF', 'CUS-A1B2');
    });
  });
});
