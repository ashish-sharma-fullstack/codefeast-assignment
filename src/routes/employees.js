'use strict';

const { Router } = require('express');
const employeeController = require('../controllers/employee.controller');

const router = Router();

router.get('/',    employeeController.findAll);
router.get('/:id', employeeController.findById);
router.post('/',   employeeController.create);
router.put('/:id', employeeController.update);

module.exports = router;
