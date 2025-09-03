// test/utils.jwt.test.js
const { sign, verify } = require('../utils/jwt');

describe('JWT Utils', () => {
  test('sign y verify deberían generar y validar token', () => {
    const token = sign({ id: 1 });
    const payload = verify(token);

    expect(payload).toHaveProperty('id', 1);
  });
});
