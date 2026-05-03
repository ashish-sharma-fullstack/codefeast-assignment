'use strict';

const employeeService = require('../services/employee.service');

const create = async (req, res, next) => {
  try {
    const employee = await employeeService.create(req.body);
    res.status(201).json({ success: true, data: employee });
  } catch (err) { next(err); }
};

const findAll = async (_req, res, next) => {
  try {
    const employees = await employeeService.findAll();
    res.status(200).json({ success: true, data: employees });
  } catch (err) { next(err); }
};

const findById = async (req, res, next) => {
  try {
    const employee = await employeeService.findById(req.params.id);
    res.status(200).json({ success: true, data: employee });
  } catch (err) { next(err); }
};

module.exports = { create, findAll, findById };
