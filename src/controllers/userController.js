const User = require('../models/User');
const Project = require('../models/Project');
const Invoice = require('../models/Invoice');

exports.listUsers = async (req, res) => {
	const users = await User.find().select('-password').lean();
	// augment with project counts (optional)
	const userIds = users.map(u => u._id);
	const projects = await Project.aggregate([
		{ $match: { owner: { $in: userIds }, status: 'active' } },
		{ $group: { _id: '$owner', count: { $sum: 1 } } }
	]);
	const userIdToProjectCount = new Map(projects.map(p => [String(p._id), p.count]));
	const results = users.map(u => ({
		...u,
		projectCount: userIdToProjectCount.get(String(u._id)) || 0
	}));
	res.json(results);
};

exports.updateUserRole = async (req, res) => {
	const { id } = req.params;
	const { role } = req.body;
	if (!['admin', 'user'].includes(role)) {
		return res.status(400).json({ message: 'Invalid role' });
	}
	const updated = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
	if (!updated) return res.status(404).json({ message: 'User not found' });
	res.json(updated);
};

exports.updateUser = async (req, res) => {
	const { id } = req.params;
	const updates = {};
	if (typeof req.body.name === 'string') updates.name = req.body.name;
	if (typeof req.body.email === 'string') updates.email = req.body.email;
	if (req.body.role && ['admin', 'user'].includes(req.body.role)) updates.role = req.body.role;
	// handle adminId linkage for users
	if (req.body.adminId) {
		updates.adminId = req.body.adminId;
	}
	// If role becomes 'user', ensure adminId points to an admin
	if ((updates.role === 'user' || updates.role === undefined) && updates.adminId) {
		const admin = await User.findOne({ _id: updates.adminId, role: 'admin' }).select('_id');
		if (!admin) return res.status(400).json({ message: 'adminId must be an existing admin' });
	}
	const updated = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).select('-password');
	if (!updated) return res.status(404).json({ message: 'User not found' });
	res.json(updated);
};

exports.deleteUser = async (req, res) => {
	const { id } = req.params;
	const deleted = await User.findByIdAndDelete(id);
	if (!deleted) return res.status(404).json({ message: 'User not found' });
	res.json({ ok: true });
};


