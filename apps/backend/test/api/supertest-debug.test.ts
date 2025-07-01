import request from 'supertest';
import express from 'express';

describe('Supertest Debug', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.get('/test', (req, res) => {
      res.json({ message: 'test' });
    });
  });

  it('should verify supertest works', async () => {
    console.log('request type:', typeof request);
    console.log('request:', request);

    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.body.message).toBe('test');
  });
});
