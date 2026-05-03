'use strict';

const metricsService = require('../services/metrics.service');

const getSalaryMetrics = async (req, res, next) => {
  try {
    const data = await metricsService.getSalaryMetrics(req.query.country);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

const getJobMetrics = async (req, res, next) => {
  try {
    const data = await metricsService.getJobMetrics(req.query.title);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

module.exports = { getSalaryMetrics, getJobMetrics };
