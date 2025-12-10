const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const projectController = require('../controllers/projectController');

const router = express.Router();

router.get('/', authenticate, projectController.getProjects);
router.get('/:id', authenticate, param('id').isMongoId(), projectController.getProjectById);

router.post(
	'/',
	authenticate,
	authorizeRoles('admin'),
	body('idName').matches(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/),
	body('fullName').isString().isLength({ min: 2 }),
	body('owner').isMongoId(),
	body('assignedAdmin').optional().isMongoId(),
	body('startDate').isISO8601(),
	body('bankAddress').isString().isLength({ min: 3 }),
	body('status').optional().isIn(['active', 'inactive']),
	body('percentage').optional().isFloat({ min: 0, max: 100 }),
	projectController.createProject
);

router.put(
	'/:id',
	authenticate,
	authorizeRoles('admin'),
	param('id').isMongoId(),
	body('idName').optional().matches(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/),
	body('fullName').optional().isString().isLength({ min: 2 }),
	body('owner').optional().isMongoId(),
	body('assignedAdmin').optional().isMongoId(),
	body('startDate').optional().isISO8601(),
	body('bankAddress').optional().isString().isLength({ min: 3 }),
	body('status').optional().isIn(['active', 'inactive']),
	body('percentage').optional().isFloat({ min: 0, max: 100 }),
	projectController.updateProject
);

module.exports = router;


