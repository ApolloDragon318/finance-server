const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
	amount: { type: Number, required: true, default: 0 },
	incomeDate: { type: Date, required: true },
	projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
	// Snapshot of the project's percentage at the time the invoice is created
	percentage: { type: Number, required: true, min: 0, max: 100 },
	// Snapshot of the admin who should receive the remainder share
	adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true }
}, { timestamps: true });

const Invoice = mongoose.model('Invoice', InvoiceSchema);
module.exports = Invoice;


