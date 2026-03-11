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
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CustomersService } from '../services/customers.service';
import { CreateCustomerDto } from '../models/dto/create-customer.dto';
import { UpdateCustomerDto } from '../models/dto/update-customer.dto';
import { CustomerResponseDto } from '../models/dto/customer-response.dto';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { NamespaceGuard } from '../middleware/namespace.guard';
import { JwtPayload } from '../middleware/jwt.strategy';

/**
 * Extract raw bearer token from Authorization header.
 */
function extractToken(authHeader?: string): string {
  if (!authHeader) return '';
  const parts = authHeader.split(' ');
  return parts.length === 2 ? parts[1] : '';
}

/**
 * Customer management endpoints, scoped to an organization namespace.
 * All routes enforce JWT authentication and namespace isolation via orgId.
 */
@ApiTags('customers')
@ApiBearerAuth()
@Controller('api/v1/O/:orgId/customers')
@UseGuards(JwtAuthGuard, NamespaceGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List customers', description: 'List all customers in an organization.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiResponse({ status: 200, description: 'List of customers returned.' })
  async findAll(@Param('orgId') orgId: string): Promise<CustomerResponseDto[]> {
    return this.customersService.findAll(orgId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create customer', description: 'Create a new customer in an organization. PII fields are tokenized via the PII Vault.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiResponse({ status: 201, description: 'Customer created successfully.' })
  async create(
    @Param('orgId') orgId: string,
    @Body() dto: CreateCustomerDto,
    @Headers('authorization') authHeader: string,
  ): Promise<CustomerResponseDto> {
    return this.customersService.create(orgId, dto, extractToken(authHeader));
  }

  @Get(':customerId')
  @ApiOperation({ summary: 'Get customer', description: 'Get a customer by hashId. PII fields are only included if the caller has the pii:detokenize privilege.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiParam({ name: 'customerId', description: 'Customer short hash ID', example: 'CUS-81F3' })
  @ApiResponse({ status: 200, description: 'Customer returned.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  async findOne(
    @Param('orgId') orgId: string,
    @Param('customerId') customerId: string,
    @Req() req: { user: JwtPayload },
    @Headers('authorization') authHeader: string,
  ): Promise<CustomerResponseDto> {
    const canDetokenize = req.user.privileges?.includes('pii:detokenize') ?? false;
    return this.customersService.findOne(orgId, customerId, canDetokenize, extractToken(authHeader));
  }

  @Put(':customerId')
  @ApiOperation({ summary: 'Update customer', description: 'Update a customer. PII fields will be re-tokenized via the PII Vault.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiParam({ name: 'customerId', description: 'Customer short hash ID', example: 'CUS-81F3' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  async update(
    @Param('orgId') orgId: string,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerDto,
    @Headers('authorization') authHeader: string,
  ): Promise<CustomerResponseDto> {
    return this.customersService.update(orgId, customerId, dto, extractToken(authHeader));
  }

  @Delete(':customerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete customer', description: 'Delete a customer from an organization.' })
  @ApiParam({ name: 'orgId', description: 'Organization short hash ID', example: 'O-92AF' })
  @ApiParam({ name: 'customerId', description: 'Customer short hash ID', example: 'CUS-81F3' })
  @ApiResponse({ status: 204, description: 'Customer deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  async remove(
    @Param('orgId') orgId: string,
    @Param('customerId') customerId: string,
  ): Promise<void> {
    return this.customersService.remove(orgId, customerId);
  }
}
