const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');
const User = require('../../src/models/user.model');

const password = 'password1';
const salt = bcrypt.genSaltSync(8);
const hashedPassword = bcrypt.hashSync(password, salt);

const userOne = {
  _id: new mongoose.Types.ObjectId(),
  firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
  email: faker.internet.email().toLowerCase(),
  password,
  role: { id: 2, name: 'USER' },
  isEmailVerified: false,
};

const userTwo = {
  _id: new mongoose.Types.ObjectId(),
  firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
  email: faker.internet.email().toLowerCase(),
  password,
  role: { id: 2, name: 'USER' },
  isEmailVerified: false,
};

const admin = {
  _id: new mongoose.Types.ObjectId(),
  firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
  email: faker.internet.email().toLowerCase(),
  password,
  role: { id: 1, name: 'ADMIN' },
  isEmailVerified: false,
};

const insertUsers = async (users) => {
  await User.insertMany(users.map((user) => ({ ...user, password: hashedPassword })));
};

module.exports = {
  userOne,
  userTwo,
  admin,
  insertUsers,
};
