'use strict';

const asyncHandler   = require('../utils/asyncHandler');
const employeeService = require('../services/employee.service');

const create = asyncHandler(async (req, res) => {
  const employee = await employeeService.create(req.body);
  res.status(201).json({ success: true, data: employee });
});

const findAll = asyncHandler(async (_req, res) => {
  const employees = await employeeService.findAll();
  res.status(200).json({ success: true, data: employees });
});

const findById = asyncHandler(async (req, res) => {
  const employee = await employeeService.findById(req.params.id);
  res.status(200).json({ success: true, data: employee });
});

const update = asyncHandler(async (req, res) => {
  const employee = await employeeService.update(req.params.id, req.body);
  res.status(200).json({ success: true, data: employee });
});

const remove = asyncHandler(async (req, res) => {
  await employeeService.remove(req.params.id);
  res.status(200).json({ success: true, message: 'Employee deleted successfully' });
});

const getSalary = asyncHandler(async (req, res) => {
  const result = await employeeService.getSalary(req.params.id, req.query.country);
  res.status(200).json({ success: true, data: result });
});

module.exports = { create, findAll, findById, update, remove, getSalary };
