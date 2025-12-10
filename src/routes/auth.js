const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

const allowPublic = String(process.env.ALLOW_PUBLIC_SIGNUP || '').toLowerCase() === 'true';

if (allowPublic) {
	// Public signup: no auth required; server will force role to 'user' unless requester is admin
	router.post(
		'/register',
		body('name').isString().isLength({ min: 2 }),
		body('email').isEmail(),
		body('password').isLength({ min: 6 }),
		body('role').optional().isIn(['admin', 'user']),
		body('adminId').optional().isMongoId(),
		authController.register
	);
} else {
	// Admin-only: must be authenticated admin to create users (including admin)
	router.post(
		'/register',
		authenticate,
		authorizeRoles('admin'),
		body('name').isString().isLength({ min: 2 }),
		body('email').isEmail(),
		body('password').isLength({ min: 6 }),
		body('role').optional().isIn(['admin', 'user']),
		body('adminId').optional().isMongoId(),
		authController.register
	);
}

router.post(
	'/login',
	body('email').isEmail(),
	body('password').isLength({ min: 6 }),
	authController.login
);

router.get('/me', authenticate, authController.me);

router.post(
	'/change-password',
	authenticate,
	body('oldPassword').isLength({ min: 6 }),
	body('newPassword').isLength({ min: 6 }),
	authController.changePassword
);

module.exports = router;


