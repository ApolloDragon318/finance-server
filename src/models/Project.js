const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
	idName: {
		type: String,
		required: true,
		unique: true,
		trim: true,
		match: /^[A-Z0-9]{3}-[A-Z0-9]{3}$/ // XXX-XXX format
	},
	fullName: { type: String, required: true, trim: true },
	// Owner of the project (can be any user, admin or user).
	owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
	// Admin who receives remainder payments for invoices on this project (can be same as owner).
	assignedAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
	startDate: { type: Date, required: true },
	bankAddress: { type: String, required: true, trim: true },
	status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
	invoices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
	percentage: { type: Number, default: 50, min: 0, max: 100 }
}, { timestamps: true });

const Project = mongoose.model('Project', ProjectSchema);
module.exports = Project;


