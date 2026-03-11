const { validationResult } = require('express-validator');
const Invoice = require('../models/Invoice');
const Project = require('../models/Project');

exports.createInvoice = async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
	const { projectId, amount, incomeDate, reason } = req.body;
	const project = await Project.findById(projectId).populate('assignedAdmin owner', 'name role');
	if (!project) return res.status(404).json({ message: 'Project not found' });
	const invoice = await Invoice.create({
		projectId,
		amount,
		incomeDate,
		reason: reason || '',
		percentage: project.percentage,
		// Remainder goes to the project's owner admin
		adminId: project.assignedAdmin?._id || null
	});
	// maintain project reference
	project.invoices.push(invoice._id);
	await project.save();
	res.status(201).json(invoice);
};

exports.getInvoices = async (req, res) => {
	const isAdmin = req.user.role === 'admin';
	let filter = {};
	if (req.query.projectId) {
		filter.projectId = req.query.projectId;
	}
	if (!isAdmin) {
		// only invoices for projects assigned to current user
		const projects = await Project.find({ assignedUser: req.user._id }).select('_id');
		const ids = projects.map(p => p._id);
		filter.projectId = filter.projectId ? filter.projectId : { $in: ids };
	}
	const invoices = await Invoice.find(filter).populate({
		path: 'projectId',
		select: 'idName fullName assignedAdmin',
		populate: { path: 'assignedAdmin', select: 'name email' }
	}).lean();
	res.json(invoices);
};


