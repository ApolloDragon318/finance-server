const express = require('express');
const { authenticate } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.get('/stats', authenticate, dashboardController.getStats);

module.exports = router;


