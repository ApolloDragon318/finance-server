const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/', authenticate, authorizeRoles('admin'), userController.listUsers);
router.patch(
	'/:id/role',
	authenticate,
	authorizeRoles('admin'),
	param('id').isMongoId(),
	body('role').isIn(['admin', 'user']),
	userController.updateUserRole
);
router.patch(
	'/:id',
	authenticate,
	authorizeRoles('admin'),
	param('id').isMongoId(),
	body('name').optional().isString().isLength({ min: 2 }),
	body('email').optional().isEmail(),
	body('role').optional().isIn(['admin', 'user']),
	body('adminId').optional().isMongoId(),
	userController.updateUser
);
router.delete(
	'/:id',
	authenticate,
	authorizeRoles('admin'),
	param('id').isMongoId(),
	userController.deleteUser
);

module.exports = router;


