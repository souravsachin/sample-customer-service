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
@Controller('api/v1/O/:orgId/customers')
@UseGuards(JwtAuthGuard, NamespaceGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async findAll(@Param('orgId') orgId: string): Promise<CustomerResponseDto[]> {
    return this.customersService.findAll(orgId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('orgId') orgId: string,
    @Body() dto: CreateCustomerDto,
    @Headers('authorization') authHeader: string,
  ): Promise<CustomerResponseDto> {
    return this.customersService.create(orgId, dto, extractToken(authHeader));
  }

  @Get(':customerId')
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
  async remove(
    @Param('orgId') orgId: string,
    @Param('customerId') customerId: string,
  ): Promise<void> {
    return this.customersService.remove(orgId, customerId);
  }
}
