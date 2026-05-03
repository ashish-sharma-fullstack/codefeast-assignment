'use strict';

const { Router } = require('express');
const employeeController = require('../controllers/employee.controller');

const router = Router();

router.post('/', employeeController.create);

module.exports = router;
