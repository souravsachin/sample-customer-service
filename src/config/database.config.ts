import { DataSource } from 'typeorm';
import { Customer } from '../models/entities/customer.entity';

/**
 * TypeORM data source for CLI migrations.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5440', 10),
  database: process.env.DATABASE_NAME || 'sample_customer',
  username: process.env.DATABASE_USER || 'zorbit',
  password: process.env.DATABASE_PASSWORD || 'zorbit_dev',
  entities: [Customer],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
});
