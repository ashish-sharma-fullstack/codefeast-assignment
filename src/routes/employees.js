'use strict';

const { Router } = require('express');
const employeeController = require('../controllers/employee.controller');

const router = Router();

router.get('/',            employeeController.findAll);
router.get('/:id/salary',  employeeController.getSalary);   // before /:id
router.get('/:id',         employeeController.findById);
router.post('/',           employeeController.create);
router.put('/:id',         employeeController.update);
router.delete('/:id',      employeeController.remove);

module.exports = router;
