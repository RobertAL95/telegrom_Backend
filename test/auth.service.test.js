// test/auth.service.test.js
const User = require('../Auth/model'); // <-- aquí ajusta la ruta a tu modelo real
const bcrypt = require('bcrypt');
const { sign } = require('../utils/jwt');
const authService = require('../Auth/service');

jest.mock('../Auth/model');
jest.mock('bcrypt');
jest.mock('../utils/jwt');

describe('Auth Service', () => {
  afterEach(() => jest.clearAllMocks());

  test('register debería guardar un usuario con password hasheado', async () => {
    const data = { email: 'a@test.com', password: '1234' };
    bcrypt.hash.mockResolvedValue('hashed');
    User.prototype.save = jest.fn().mockResolvedValue({ ...data, password: 'hashed' });

    const result = await authService.register(data);

    expect(bcrypt.hash).toHaveBeenCalledWith('1234', 10);
    expect(result.password).toBe('hashed');
  });

  test('login debería retornar un token válido', async () => {
    const data = { email: 'a@test.com', password: '1234' };
    const user = { email: 'a@test.com', password: 'hashed' };

    User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);
    sign.mockReturnValue('fake-token');

    const token = await authService.login(data);

    expect(User.findOne).toHaveBeenCalledWith({ email: data.email });
    expect(token).toBe('fake-token');
  });

  test('login debería lanzar error si el usuario no existe', async () => {
    User.findOne.mockResolvedValue(null);

    await expect(authService.login({ email: 'x@test.com', password: '123' }))
      .rejects.toThrow('No encontrado');
  });

  test('oauth debería crear usuario si no existe', async () => {
    const profile = { emails: [{ value: 'new@test.com' }], displayName: 'Nuevo' };
    User.findOne.mockResolvedValue(null);
    User.prototype.save = jest.fn().mockResolvedValue({ email: 'new@test.com', name: 'Nuevo' });
    sign.mockReturnValue('token-oauth');

    const token = await authService.oauth(profile);

    expect(User.findOne).toHaveBeenCalledWith({ email: 'new@test.com' });
    expect(token).toBe('token-oauth');
  });
});
