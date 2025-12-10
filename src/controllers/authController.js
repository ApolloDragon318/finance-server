const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

function signToken(user) {
	return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

exports.register = async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}
	const { name, email, password, role } = req.body;
	const adminId = req.body.adminId;
	const exists = await User.findOne({ email });
	if (exists) return res.status(400).json({ message: 'Email already in use' });
	// Only an authenticated admin may create an admin; everyone else defaults to 'user'
	const requesterRole = req.user?.role;
	const createRole = requesterRole === 'admin' && role === 'admin' ? 'admin' : 'user';
	// If creating a normal user, adminId is required and must point to an admin
	let adminRef = null;
	if (createRole === 'user') {
		if (!adminId) {
			return res.status(400).json({ message: 'adminId is required for user accounts' });
		}
		const adminUser = await User.findOne({ _id: adminId, role: 'admin' }).select('_id');
		if (!adminUser) {
			return res.status(400).json({ message: 'adminId must be an existing admin' });
		}
		adminRef = adminUser._id;
	}
	const user = await User.create({ name, email, password, role: createRole, adminId: adminRef });
	res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
};

exports.login = async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}
	const { email, password } = req.body;
	const user = await User.findOne({ email });
	if (!user) return res.status(401).json({ message: 'Invalid credentials' });
	const ok = await user.comparePassword(password);
	if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
	const token = signToken(user);
	res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
};

exports.me = async (req, res) => {
	res.json({ user: req.user });
};

exports.changePassword = async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}
	const { oldPassword, newPassword } = req.body;
	const user = await User.findById(req.user._id);
	if (!user) return res.status(404).json({ message: 'User not found' });
	const ok = await user.comparePassword(oldPassword);
	if (!ok) return res.status(400).json({ message: 'Old password incorrect' });
	user.password = newPassword;
	await user.save();
	res.json({ message: 'Password changed' });
};


