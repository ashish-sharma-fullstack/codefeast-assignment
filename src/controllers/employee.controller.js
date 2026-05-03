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

const update = async (req, res, next) => {
  try {
    const employee = await employeeService.update(req.params.id, req.body);

    res.status(200).json({ success: true, data: employee });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await employeeService.remove(req.params.id);
    res.status(200).json({ success: true, message: 'Employee deleted successfully' });
  } catch (err) { next(err); }
};

const getSalary = async (req, res, next) => {
  try {
    const result = await employeeService.getSalary(req.params.id, req.query.country);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

module.exports = { create, findAll, findById, update, remove, getSalary };
