const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function authenticate(req, res, next) {
	const authHeader = req.headers.authorization || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
	if (!token) return res.status(401).json({ message: 'Unauthorized' });
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const user = await User.findById(decoded.id).select('-password');
		if (!user) return res.status(401).json({ message: 'Unauthorized' });
		req.user = user;
		next();
	} catch (err) {
		return res.status(401).json({ message: 'Unauthorized' });
	}
}

function authorizeRoles(...roles) {
	return (req, res, next) => {
		if (!req.user || !roles.includes(req.user.role)) {
			return res.status(403).json({ message: 'Forbidden' });
		}
		next();
	};
}

module.exports = { authenticate, authorizeRoles };


