const express = require('express');
const router = express.Router();
const controller = require('./controller');
const response = require('../network/response');

router.post('/add', async (req, res) => {
  try {
    const result = await controller.addContact(req.body);
    response.success(req, res, result);
  } catch (e) {
    response.error(req, res, e.message);
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const result = await controller.getContacts(req.params.userId);
    response.success(req, res, result);
  } catch (e) {
    response.error(req, res, e.message);
  }
});

module.exports = router;