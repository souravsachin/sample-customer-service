import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersController } from '../controllers/customers.controller';
import { CustomersService } from '../services/customers.service';
import { HashIdService } from '../services/hash-id.service';
import { PiiVaultClient } from '../services/pii-vault.client';
import { Customer } from '../models/entities/customer.entity';
import { EventsModule } from './events.module';

@Module({
  imports: [TypeOrmModule.forFeature([Customer]), EventsModule],
  controllers: [CustomersController],
  providers: [CustomersService, HashIdService, PiiVaultClient],
  exports: [CustomersService],
})
export class CustomersModule {}
