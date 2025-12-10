function startOfWeek(date) {
	const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const day = d.getUTCDay(); // 0 (Sun) - 6 (Sat)
	const diff = (day + 6) % 7; // make Monday week start
	d.setUTCDate(d.getUTCDate() - diff);
	d.setUTCHours(0, 0, 0, 0);
	return d;
}

function startOfMonth(date) {
	const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
	d.setUTCHours(0, 0, 0, 0);
	return d;
}

function startOfYear(date) {
	const d = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
	d.setUTCHours(0, 0, 0, 0);
	return d;
}

function addWeeks(date, n) {
	const d = new Date(date);
	d.setUTCDate(d.getUTCDate() + n * 7);
	return d;
}

function addMonths(date, n) {
	const d = new Date(date);
	d.setUTCMonth(d.getUTCMonth() + n);
	return d;
}

function addYears(date, n) {
	const d = new Date(date);
	d.setUTCFullYear(d.getUTCFullYear() + n);
	return d;
}

module.exports = { startOfWeek, startOfMonth, startOfYear, addWeeks, addMonths, addYears };


