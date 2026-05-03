'use strict';

const prisma = require('../utils/prisma');

const create   = (data)     => prisma.employee.create({ data });
const findAll  = ()         => prisma.employee.findMany({ orderBy: { createdAt: 'desc' } });
const findById = (id)       => prisma.employee.findUnique({ where: { id } });
const update   = (id, data) => prisma.employee.update({ where: { id }, data });

module.exports = { create, findAll, findById, update };
