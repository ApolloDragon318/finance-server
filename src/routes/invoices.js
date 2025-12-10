const express = require('express');
const { body, query } = require('express-validator');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const invoiceController = require('../controllers/invoiceController');

const router = express.Router();

router.get(
	'/',
	authenticate,
	query('projectId').optional().isMongoId(),
	invoiceController.getInvoices
);

router.post(
	'/',
	authenticate,
	authorizeRoles('admin'),
	body('projectId').isMongoId(),
	body('amount').isFloat({ min: 0 }),
	body('incomeDate').isISO8601(),
	invoiceController.createInvoice
);

module.exports = router;


