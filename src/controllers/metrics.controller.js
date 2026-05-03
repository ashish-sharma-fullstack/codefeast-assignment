'use strict';

const asyncHandler    = require('../utils/asyncHandler');
const metricsService  = require('../services/metrics.service');

const getSalaryMetrics = asyncHandler(async (req, res) => {
  const data = await metricsService.getSalaryMetrics(req.query.country);
  res.status(200).json({ success: true, data });
});

const getJobMetrics = asyncHandler(async (req, res) => {
  const data = await metricsService.getJobMetrics(req.query.title);
  res.status(200).json({ success: true, data });
});

module.exports = { getSalaryMetrics, getJobMetrics };
