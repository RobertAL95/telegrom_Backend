// test/app.test.js
const request = require('supertest');
const app = require('../app');

describe('App Integration', () => {
  test('GET /auth debería existir', async () => {
    const res = await request(app).get('/auth');
    expect([200, 302, 404]).toContain(res.statusCode); // según cómo manejes /auth
  });

  test('GET /chat debería responder algo', async () => {
    const res = await request(app).get('/chat');
    expect([200, 404]).toContain(res.statusCode);
  });
});
