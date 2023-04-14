// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
// import sqlite3 from "sqlite3";
// sqlite3.verbose();
//
// const DB = new sqlite3.Database(
// 	`${process.cwd()}/database.sqlite`,
// 	sqlite3.OPEN_READWRITE,
// 	(err) => {
// 		if (!err)
// 		{
// 			console.log("successfully opened sqlite DB");
// 			return
// 		}
// 		console.log(`error with opening sqlite DB: ${err}`);
// 	}
// );
// DB.run("CREATE TABLE IF NOT EXISTS checkout (token TEXT PRIMARY KEY, username TEXT);");

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import GDPRWebhookHandlers from "./gdpr.js";
import utils from "./utils.js";

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT, 10);

const STATIC_PATH = process.env.NODE_ENV === "production"
	? `${process.cwd()}/frontend/dist`
	: `${process.cwd()}/frontend/`;

const app = express();

app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
	shopify.config.auth.callbackPath,
	shopify.auth.callback(),
	shopify.redirectToShopifyOrAppRoot()
);
app.post(
	shopify.config.webhooks.path,
	shopify.processWebhooks({webhookHandlers: GDPRWebhookHandlers}),
);
console.log(shopify.api.webhooks.getTopicsAdded());

app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());

app.get("/api/gift", async (req, res) => {
	const {product_id, variant_id, username} = req.query;
	if ((!product_id) || (!variant_id) || (!username))
	{
		res.status(400).send("product_id, variant_id, and username is required");
		return
	}

	try
	{
		const session = res.locals.shopify.session;

		const {product, variant} = await utils.get_product_variant(
			session,
			product_id,
			variant_id
		);

		// const draft_order = await utils.create_draft_order(session, variant.id);
		const checkout = await utils.create_checkout(session, variant.id);
		// DB.run(
		// 	"INSERT INTO checkout (token, username) VALUES(?, ?)",
		// 	[checkout.token, username],
		// 	(err) => {
		// 		if (!err)
		// 			return
		// 		console.log(err);
		// 		res.status(400).send(err);
		// 	}
		// );

		res.status(200).send({
			// product,
			// variant,
			// checkout,
			username: username,
			checkout_url: checkout.web_url,
		});
	}
	catch (e)
	{
		console.log(e)
		res.status(400).send(e);
	}
});

app.get("/api/products/count", async (_req, res) => {
	const countData = await shopify.api.rest.Product.count({
		session: res.locals.shopify.session,
	});
	res.status(200).send(countData);
});

app.get("/api/products/create", async (_req, res) => {
	let status = 200;
	let error = null;

	try
	{
		await productCreator(res.locals.shopify.session);
	}
	catch (e)
	{
		console.log(`Failed to process products/create: ${e.message}`);
		status = 500;
		error = e.message;
	}
	res.status(status).send({ success: status === 200, error });
});

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
	return res
		.status(200)
		.set("Content-Type", "text/html")
		.send(readFileSync(join(STATIC_PATH, "index.html")));
});

app.listen(PORT);
