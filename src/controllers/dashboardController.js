const Invoice = require('../models/Invoice');
const Project = require('../models/Project');
const { startOfWeek, startOfMonth, startOfYear, addWeeks, addMonths, addYears } = require('../utils/date');

exports.getStats = async (req, res) => {
	const now = new Date();
	const isAdmin = req.user.role === 'admin';
	let projectFilter = {};
	if (!isAdmin) {
		projectFilter.owner = req.user._id;
	}
	const projects = await Project.find(projectFilter).select('_id');
	const projectIds = projects.map(p => p._id);

	const invoiceMatch = projectIds.length ? { projectId: { $in: projectIds } } : { projectId: { $exists: false } };
	// Overall total
	const overallAgg = await Invoice.aggregate([
		{ $match: invoiceMatch },
		{ $group: { _id: null, total: { $sum: '$amount' } } }
	]);
	const overallTotal = overallAgg[0]?.total || 0;

	// Helper to compute per-bucket user/admin shares
	async function computeBucketShares(start, end) {
		const result = await Invoice.aggregate([
			{ $match: { ...invoiceMatch, incomeDate: { $gte: start, $lt: end } } },
			{
				$facet: {
					users: [
						{
							$lookup: {
								from: 'projects',
								localField: 'projectId',
								foreignField: '_id',
								as: 'project'
							}
						},
						{ $unwind: '$project' },
						{
							$group: {
								_id: '$project.owner',
								total: { $sum: { $multiply: ['$amount', { $divide: ['$percentage', 100] }] } }
							}
						}
					],
					admins: [
						{
							$group: {
								_id: '$adminId',
								total: { $sum: { $multiply: ['$amount', { $subtract: [1, { $divide: ['$percentage', 100] }] }] } }
							}
						}
					]
				}
			}
		]);
		const users = result?.[0]?.users || [];
		const admins = result?.[0]?.admins || [];
		return { users, admins };
	}

	// Weekly (last 12 weeks) - multi-series per user + admin
	const weeks = [];
	const startW = startOfWeek(now);
	for (let i = 11; i >= 0; i--) {
		const start = addWeeks(startW, -i);
		const end = addWeeks(start, 1);
		weeks.push({ start, end });
	}
	const weeklyBuckets = weeks.map(w => w.start.toISOString().slice(0, 10));
	const weeklyShares = await Promise.all(weeks.map(w => computeBucketShares(w.start, w.end)));

	// Monthly (last 12 months)
	const months = [];
	const startM = startOfMonth(now);
	for (let i = 11; i >= 0; i--) {
		const start = addMonths(startM, -i);
		const end = addMonths(start, 1);
		months.push({ start, end });
	}
	const monthlyBuckets = months.map(m => `${m.start.getUTCFullYear()}-${String(m.start.getUTCMonth() + 1).padStart(2, '0')}`);
	const monthlyShares = await Promise.all(months.map(m => computeBucketShares(m.start, m.end)));

	// Yearly (last 5 years)
	const years = [];
	const startY = startOfYear(now);
	for (let i = 4; i >= 0; i--) {
		const start = addYears(startY, -i);
		const end = addYears(start, 1);
		years.push({ start, end });
	}
	const yearlyBuckets = years.map(y => String(y.start.getUTCFullYear()));
	const yearlyShares = await Promise.all(years.map(y => computeBucketShares(y.start, y.end)));

	// Collect all user ids across buckets to fetch display names
	function collectUserIds(shares) {
		const set = new Set();
		for (const s of shares) {
			for (const u of s.users) {
				if (u._id) set.add(String(u._id));
			}
		}
		return Array.from(set);
	}
	const weeklyUserIds = collectUserIds(weeklyShares);
	const monthlyUserIds = collectUserIds(monthlyShares);
	const yearlyUserIds = collectUserIds(yearlyShares);
	// include admins as well so their names are available
	const User = require('../models/User');
	const adminDocs = await User.find({ role: 'admin' }).select('name');
	const adminIds = adminDocs.map(a => String(a._id));
	const allUserIds = Array.from(new Set([...weeklyUserIds, ...monthlyUserIds, ...yearlyUserIds, ...adminIds]));
	// Build user list to include in charts
	let usersDocs;
	if (isAdmin) {
		usersDocs = await User.find({}).select('name role');
	} else {
		usersDocs = await User.find({ _id: { $in: [req.user._id, ...adminIds] } }).select('name role');
	}
	const includeIds = usersDocs.map(u => String(u._id));
	const idToName = new Map(usersDocs.map(u => [String(u._id), u.name]));

	function buildLines(buckets, shares) {
		const idToValues = new Map();
		// Initialize lines for all included users
		for (const uid of includeIds) {
			idToValues.set(uid, Array(buckets.length).fill(0));
		}
		for (let i = 0; i < shares.length; i++) {
			const s = shares[i];
			// users
			for (const u of s.users) {
				const id = String(u._id);
				if (!idToValues.has(id)) idToValues.set(id, Array(buckets.length).fill(0));
				idToValues.get(id)[i] = u.total || 0;
			}
			// admin remainders to specific adminId
			for (const a of s.admins) {
				const id = String(a._id);
				if (!id) continue;
				if (!idToValues.has(id)) idToValues.set(id, Array(buckets.length).fill(0));
				idToValues.get(id)[i] += a.total || 0;
			}
		}
		// Build lines with display names
		const lines = Array.from(idToValues.entries()).map(([id, values]) => ({
			id,
			name: idToName.get(id) || 'User',
			values
		}));
		return { buckets, lines };
	}

	const weekly = buildLines(weeklyBuckets, weeklyShares);
	const monthly = buildLines(monthlyBuckets, monthlyShares);
	const yearly = buildLines(yearlyBuckets, yearlyShares);

	// Member totals (overall) using snapshot percentage on each invoice
	function distributeToUsers(usersAgg, adminTotal, include = includeIds) {
		const totalsMap = new Map(include.map(id => [String(id), 0]));
		for (const u of usersAgg) {
			const id = String(u._id);
			totalsMap.set(id, (totalsMap.get(id) || 0) + (u.total || 0));
		}
		if (adminIds.length > 0) {
			const perAdmin = (adminTotal || 0) / adminIds.length;
			for (const adminId of adminIds) {
				totalsMap.set(adminId, (totalsMap.get(adminId) || 0) + perAdmin);
			}
		}
		const arr = Array.from(totalsMap.entries()).map(([id, total]) => ({
			id,
			name: idToName.get(id) || adminDocs.find(a => String(a._id) === id)?.name || 'User',
			total
		}));
		// Sort high -> low
		arr.sort((a, b) => (b.total || 0) - (a.total || 0));
		return arr;
	}

	// userShare = amount * (percentage/100), adminShare = amount * (1 - percentage/100)
	const memberAgg = await Invoice.aggregate([
		{ $match: invoiceMatch },
		{
			$lookup: {
				from: 'projects',
				localField: 'projectId',
				foreignField: '_id',
				as: 'project'
			}
		},
		{ $unwind: '$project' },
		{
			$addFields: {
				userShare: { $multiply: ['$amount', { $divide: ['$percentage', 100] }] },
				adminShare: { $multiply: ['$amount', { $subtract: [1, { $divide: ['$percentage', 100] }] }] },
				owner: '$project.owner'
			}
		},
		{
			$facet: {
				users: [
					{ $group: { _id: '$owner', total: { $sum: '$userShare' } } }
				],
				admins: [
					{ $group: { _id: '$adminId', total: { $sum: '$adminShare' } } }
				]
			}
		}
	]);

	let memberTotals = [];
	if (memberAgg && memberAgg[0]) {
		const usersTotals = memberAgg[0].users || [];
		const adminsTotals = memberAgg[0].admins || [];
		// Map user IDs to names
		// Seed with included users
		const totalsMap = new Map(includeIds.map(id => [String(id), 0]));
		for (const u of usersTotals) {
			const id = String(u._id);
			totalsMap.set(id, (totalsMap.get(id) || 0) + (u.total || 0));
		}
		for (const a of adminsTotals) {
			const id = String(a._id);
			if (!id) continue;
			totalsMap.set(id, (totalsMap.get(id) || 0) + (a.total || 0));
		}
		memberTotals = Array.from(totalsMap.entries()).map(([id, total]) => ({
			id,
			name: idToName.get(id) || 'User',
			total
		})).sort((a,b)=> (b.total||0)-(a.total||0));
	}

	// Build per-period user bar data (current week/month/year + overall)
	const currentWeek = weeklyShares[weeklyShares.length - 1] || { users: [], admins: [] };
	const currentMonth = monthlyShares[monthlyShares.length - 1] || { users: [], admins: [] };
	const currentYear = yearlyShares[yearlyShares.length - 1] || { users: [], admins: [] };
	// Current quarter
	const qStartMonth = Math.floor(now.getUTCMonth() / 3) * 3;
	const quarterStart = new Date(Date.UTC(now.getUTCFullYear(), qStartMonth, 1));
	const quarterEnd = addMonths(quarterStart, 3);
	const currentQuarter = await computeBucketShares(quarterStart, quarterEnd);
	const byUsers = {
		week: distributeToUsers(currentWeek.users, 0, includeIds).map(u => {
			// add admin contributions
			const add = currentWeek.admins.find(a => String(a._id) === u.id)?.total || 0;
			return { ...u, total: (u.total || 0) + add };
		}).sort((a,b)=> (b.total||0)-(a.total||0)),
		month: distributeToUsers(currentMonth.users, 0, includeIds).map(u => {
			const add = currentMonth.admins.find(a => String(a._id) === u.id)?.total || 0;
			return { ...u, total: (u.total || 0) + add };
		}).sort((a,b)=> (b.total||0)-(a.total||0)),
		quarter: distributeToUsers(currentQuarter.users, 0, includeIds).map(u => {
			const add = currentQuarter.admins.find(a => String(a._id) === u.id)?.total || 0;
			return { ...u, total: (u.total || 0) + add };
		}).sort((a,b)=> (b.total||0)-(a.total||0)),
		year: distributeToUsers(currentYear.users, 0, includeIds).map(u => {
			const add = currentYear.admins.find(a => String(a._id) === u.id)?.total || 0;
			return { ...u, total: (u.total || 0) + add };
		}).sort((a,b)=> (b.total||0)-(a.total||0)),
		overall: memberTotals
	};

	res.json({ overallTotal, weekly, monthly, yearly, memberTotals, byUsers });
};


