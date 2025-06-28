import { DataSource } from 'typeorm';
import { ConsentEntity } from '../src/entities/consent.entity';

let dataSource: DataSource;

beforeAll(async () => {
  dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'test_user',
    password: 'test_password',
    database: 'test_db',
    entities: [ConsentEntity],
    synchronize: true,
    dropSchema: true,
  });

  try {
    await dataSource.initialize();
    (global as any).__TYPEORM_CONNECTION__ = dataSource;
  } catch (error) {
    console.warn('TypeORM connection failed, tests will use in-memory fallback:', error.message);
  }
});

afterAll(async () => {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
  }
});
