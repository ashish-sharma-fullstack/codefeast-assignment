'use strict';

const employeeService = require('../services/employee.service');

const create = async (req, res, next) => {
  try {
    const employee = await employeeService.create(req.body);
    res.status(201).json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
};

module.exports = { create };
