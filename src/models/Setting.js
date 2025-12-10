const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
	_id: { type: String, required: true }, // e.g. 'bootstrap'
	adminInitialized: { type: Boolean, default: false }
}, { timestamps: true });

const Setting = mongoose.model('Setting', SettingSchema);
module.exports = Setting;




