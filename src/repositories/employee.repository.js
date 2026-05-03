'use strict';

const prisma = require('../utils/prisma');

const create = (data) =>
  prisma.employee.create({ data });

module.exports = { create };
