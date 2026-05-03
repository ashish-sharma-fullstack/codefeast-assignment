'use strict';

const { Router }          = require('express');
const metricsController   = require('../controllers/metrics.controller');

const router = Router();

router.get('/salary', metricsController.getSalaryMetrics);
router.get('/job',    metricsController.getJobMetrics);

module.exports = router;
