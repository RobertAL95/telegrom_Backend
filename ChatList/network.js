const express = require('express');
const router = express.Router();
const response = require('../network/response');
const controller = require('./controller');

// ➤ /chatlist/add/:userId/:contactId
router.post('/add/:userId/:contactId', async (req, res) => {
  try {
    const { userId, contactId } = req.params;

    const list = await controller.addContact({ userId, contactId });
    response.success(req, res, list, 200);
  } catch (e) {
    response.error(req, res, e.message, 400);
  }
});

// ➤ /chatlist/:userId
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const list = await controller.getContacts(userId);
    response.success(req, res, list, 200);
  } catch (e) {
    response.error(req, res, e.message, 400);
  }
});

module.exports = router;
