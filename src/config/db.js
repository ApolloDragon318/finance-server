const mongoose = require('mongoose');
let memoryServer;

async function connectToDatabase() {
	const useMemory = String(process.env.USE_IN_MEMORY_DB || '').toLowerCase() === 'true';
	mongoose.set('strictQuery', true);
	if (useMemory) {
		// Lazy import to avoid requiring the package unless needed
		const { MongoMemoryServer } = require('mongodb-memory-server');
		memoryServer = await MongoMemoryServer.create();
		const uri = memoryServer.getUri();
		await mongoose.connect(uri, { autoIndex: true });
		// eslint-disable-next-line no-console
		console.log('Connected to in-memory MongoDB');
		return;
	}
	const mongoUri = process.env.MONGO_URI;
	if (!mongoUri) {
		throw new Error('MONGO_URI is not set (or set USE_IN_MEMORY_DB=true for local dev)');
	}
	try {
		await mongoose.connect(mongoUri, { autoIndex: true });
		// eslint-disable-next-line no-console
		console.log('Connected to MongoDB');
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error('MongoDB connection error:', err?.message || err);
		throw err;
	}
}

module.exports = { connectToDatabase };


