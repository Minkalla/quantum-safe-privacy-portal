import { DataSource } from 'typeorm';
import { Consent } from '../src/models/Consent';
import { User } from '../src/models/User';

let dataSource: DataSource;

beforeAll(async () => {
  dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'password',
    database: 'portal_test',
    entities: [Consent, User],
    synchronize: true,
    dropSchema: true,
  });

  await dataSource.initialize();
  (global as any).__DATA_SOURCE__ = dataSource;
  (global as any).__DATABASE_URL__ = 'postgresql://postgres:password@localhost:5432/portal_test';
});

afterAll(async () => {
  if (dataSource) {
    await dataSource.destroy();
  }
});
