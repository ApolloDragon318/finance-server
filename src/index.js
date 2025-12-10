const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { connectToDatabase } = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
	origin: process.env.CLIENT_URL || '*',
	credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Health
app.get('/api/health', (req, res) => {
	res.json({ ok: true, ts: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/dashboard', require('./routes/dashboard'));

// 404 and error handling
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectToDatabase()
	.then(() => {
		app.listen(PORT, () => {
			// eslint-disable-next-line no-console
			console.log(`Server listening on port ${PORT}`);
		});
	})
	.catch((err) => {
		// eslint-disable-next-line no-console
		console.error('Failed to connect to DB', err);
		process.exit(1);
	});


