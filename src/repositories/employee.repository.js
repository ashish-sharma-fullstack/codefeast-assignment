'use strict';

const prisma = require('../utils/prisma');

const create    = (data)   => prisma.employee.create({ data });
const findAll   = ()       => prisma.employee.findMany({ orderBy: { createdAt: 'desc' } });
const findById  = (id)     => prisma.employee.findUnique({ where: { id } });

module.exports = { create, findAll, findById };
