const express = require('express');
const router = express.Router();
const response = require('../network/response');
const controller = require('./controller');
const passport = require('../utils/oauth');

router.post('/register', async (req, res) => {
  try {
    const result = await controller.register(req.body);
    response.success(req, res, result, 201);
  } catch (e) {
    response.error(req, res, e.message, 400);
  }
});

router.post('/login', async (req, res) => {
  try {
    const token = await controller.login(req.body);
    response.success(req, res, { token });
  } catch (e) {
    response.error(req, res, e.message, 401);
  }
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  async (req, res) => {
    const token = await controller.oauth(req.user);
    res.redirect(`/dashboard?token=${token}`);
  });

module.exports = router;