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
		channel TEXT NOT NULL,
		username TEXT NOT NULL,
		product_id INTEGER NOT NULL,
		variant_id INTEGER NOT NULL,
		status TEXT NOT NULL
	);
`);

DB.run(`
	CREATE TABLE IF NOT EXISTS webhook
	(
		id INTEGER PRIMARY KEY,
	);
`);

export default DB;
