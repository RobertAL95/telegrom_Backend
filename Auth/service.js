const User = require('./model');
const bcrypt = require('bcrypt');
const { sign } = require('../utils/jwt');

exports.register = async (data) => {
  const hashed = await bcrypt.hash(data.password, 10);
  const user = new User({ ...data, password: hashed });
  return await user.save();
};

exports.login = async (data) => {
  const user = await User.findOne({ email: data.email });
  if (!user) throw new Error('No encontrado');
  const match = await bcrypt.compare(data.password, user.password);
  if (!match) throw new Error('Credenciales inválidas');
  return sign({ id: user._id, email: user.email });
};

exports.oauth = async (profile) => {
  const email = profile.emails[0].value;
  let user = await User.findOne({ email });
  if (!user) user = await new User({ email, name: profile.displayName }).save();
  return sign({ id: user._id, email: user.email });
};