import sqlite3 from "sqlite3";
sqlite3.verbose();

const DB = new sqlite3.Database(
	`${process.cwd()}/database.sqlite`,
	sqlite3.OPEN_READWRITE,
	(err) => {
		if (!err)
		{
			console.log("successfully opened sqlite DB");
			return
		}
		console.log(`error with opening sqlite DB: ${err}`);
	}
);

DB.run(`
	CREATE TABLE IF NOT EXISTS checkout
	(
		token TEXT PRIMARY KEY,
		shop_id TEXT NOT NULL,
		order_id INTEGER,
		gifter TEXT NOT NULL,
		variant_id INTEGER NOT NULL,
		status TEXT NOT NULL,
		channel TEXT
	);
`);

DB.run(`
	CREATE TABLE IF NOT EXISTS twitch
	(
		channel TEXT PRIMARY KEY,
		auth_code TEXT,
		state TEXT,
		shop TEXT NOT NULL
	);
`);

DB.run(`
	CREATE TABLE IF NOT EXISTS winner
	(
		checkout_token TEXT PRIMARY KEY,
		channel TEXT,
		username TEXT NOT NULL,
		status TEXT NOT NULL
	);
`);

DB.run(`
	CREATE TABLE IF NOT EXISTS webhook
	(
		id TEXT PRIMARY KEY
	);
`);

export default DB;
