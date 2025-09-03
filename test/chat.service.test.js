// test/chat.service.test.js
const Chat = require('../Chat/model');
const chatService = require('../Chat/service');

// Mock de Mongoose
jest.mock('../Chat/model');

describe('Chat Service', () => {
  afterEach(() => jest.clearAllMocks());

  test('send debería guardar un chat', async () => {
    const data = { from: 'user1', to: 'user2', message: 'Hola' };
    Chat.prototype.save = jest.fn().mockResolvedValue(data);

    const result = await chatService.send(data);

    expect(Chat.prototype.save).toHaveBeenCalled();
    expect(result).toEqual(data);
  });

  test('getByUser debería retornar los chats ordenados', async () => {
    const userId = 'user1';
    const mockChats = [{ from: 'user1', to: 'user2', message: 'Hola' }];
    Chat.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockChats),
    });

    const result = await chatService.getByUser(userId);

    expect(Chat.find).toHaveBeenCalledWith({
      $or: [{ from: userId }, { to: userId }],
    });
    expect(result).toEqual(mockChats);
  });
});

