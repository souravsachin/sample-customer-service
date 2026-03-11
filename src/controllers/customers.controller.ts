import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { CustomersService } from '../services/customers.service';
import { CreateCustomerDto } from '../models/dto/create-customer.dto';
import { UpdateCustomerDto } from '../models/dto/update-customer.dto';
import { CustomerResponseDto } from '../models/dto/customer-response.dto';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { NamespaceGuard } from '../middleware/namespace.guard';
import { JwtPayload } from '../middleware/jwt.strategy';

/**
 * Customer management endpoints, scoped to an organization namespace.
 * All routes enforce JWT authentication and namespace isolation via orgId.
 */
@Controller('api/v1/O/:orgId/customers')
@UseGuards(JwtAuthGuard, NamespaceGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /**
   * GET /api/v1/O/:orgId/customers
   * List all customers in an organization.
   */
  @Get()
  async findAll(@Param('orgId') orgId: string): Promise<CustomerResponseDto[]> {
    return this.customersService.findAll(orgId);
  }

  /**
   * POST /api/v1/O/:orgId/customers
   * Create a new customer in an organization.
   * Raw PII (email, phone) is tokenized via PII Vault before storage.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('orgId') orgId: string,
    @Body() dto: CreateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return this.customersService.create(orgId, dto);
  }

  /**
   * GET /api/v1/O/:orgId/customers/:customerId
   * Get a single customer by hashId within an organization.
   * PII fields (email, phone) are only returned if the caller has
   * the pii:detokenize privilege in their JWT.
   */
  @Get(':customerId')
  async findOne(
    @Param('orgId') orgId: string,
    @Param('customerId') customerId: string,
    @Req() req: { user: JwtPayload },
  ): Promise<CustomerResponseDto> {
    const canDetokenize = req.user.privileges?.includes('pii:detokenize') ?? false;
    return this.customersService.findOne(orgId, customerId, canDetokenize);
  }

  /**
   * PUT /api/v1/O/:orgId/customers/:customerId
   * Update a customer within an organization.
   * Changed PII fields are re-tokenized via PII Vault.
   */
  @Put(':customerId')
  async update(
    @Param('orgId') orgId: string,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return this.customersService.update(orgId, customerId, dto);
  }

  /**
   * DELETE /api/v1/O/:orgId/customers/:customerId
   * Delete a customer within an organization.
   */
  @Delete(':customerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('orgId') orgId: string,
    @Param('customerId') customerId: string,
  ): Promise<void> {
    return this.customersService.remove(orgId, customerId);
  }
}
