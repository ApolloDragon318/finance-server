const { validationResult } = require('express-validator');
const Project = require('../models/Project');

exports.createProject = async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
	// Enforce logic: if owner is admin, assignedAdmin := owner and percentage := 100
	const User = require('../models/User');
	const owner = await User.findById(req.body.owner).select('role');
	if (!owner) return res.status(400).json({ message: 'Owner not found' });
	const data = { ...req.body };
	if (owner.role === 'admin') {
		data.assignedAdmin = req.body.owner;
		data.percentage = 100;
	} else {
		if (!req.body.assignedAdmin) {
			return res.status(400).json({ message: 'assignedAdmin is required when owner is not admin' });
		}
	}
	const project = await Project.create(data);
	res.status(201).json(project);
};

exports.updateProject = async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
	const { id } = req.params;
	const data = { ...req.body };
	if (data.owner) {
		const User = require('../models/User');
		const owner = await User.findById(data.owner).select('role');
		if (!owner) return res.status(400).json({ message: 'Owner not found' });
		if (owner.role === 'admin') {
			data.assignedAdmin = data.owner;
			data.percentage = 100;
		} else if (!data.assignedAdmin) {
			// keep existing assignedAdmin if not provided
		}
	}
	const updated = await Project.findByIdAndUpdate(id, data, { new: true, runValidators: true });
	if (!updated) return res.status(404).json({ message: 'Project not found' });
	res.json(updated);
};

exports.getProjects = async (req, res) => {
	const isAdmin = req.user.role === 'admin';
	// Non-admins see projects they own
	const filter = isAdmin ? {} : { owner: req.user._id };
	const projects = await Project.find(filter)
		.populate('owner', 'name email role')
		.populate('assignedAdmin', 'name email role')
		.lean();
	res.json(projects);
};

exports.getProjectById = async (req, res) => {
	const { id } = req.params;
	const project = await Project.findById(id)
		.populate('owner', 'name email role')
		.populate('assignedAdmin', 'name email role');
	if (!project) return res.status(404).json({ message: 'Project not found' });
	if (req.user.role !== 'admin' && String(project.owner?._id) !== String(req.user._id)) {
		return res.status(403).json({ message: 'Forbidden' });
	}
	res.json(project);
};


