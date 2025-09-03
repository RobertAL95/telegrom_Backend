

// test/chatList.service.test.js
const ChatList = require('../ChatList/model');
const chatListService = require('../ChatList/service');

jest.mock('../ChatList/model');

describe('ChatList Service', () => {
  afterEach(() => jest.clearAllMocks());

  test('addContact debería añadir un contacto', async () => {
    const mockList = { userId: 'user1', contacts: ['user2'] };
    ChatList.findOneAndUpdate.mockResolvedValue(mockList);

    const result = await chatListService.addContact({ userId: 'user1', contactId: 'user2' });

    expect(ChatList.findOneAndUpdate).toHaveBeenCalled();
    expect(result.contacts).toContain('user2');
  });

  test('getContacts debería devolver contactos populados', async () => {
    const mockList = { userId: 'user1', contacts: [{ _id: 'user2', name: 'Alice' }] };
    ChatList.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockList) });

    const result = await chatListService.getContacts('user1');

    expect(ChatList.findOne).toHaveBeenCalledWith({ userId: 'user1' });
    expect(result.contacts[0].name).toBe('Alice');
  });
});
