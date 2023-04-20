// @ts-check
import { join, resolve, dirname } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import GDPRWebhookHandlers from "./gdpr.js";
import DB from "./db.js";
import utils from "./utils.js";

import * as dotenv from "dotenv";
dotenv.config();

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT, 10);

const STATIC_PATH = process.env.NODE_ENV === "production"
	? `${process.cwd()}/frontend/dist`
	: `${process.cwd()}/frontend/`;

const app = express();
const __dirname = resolve(dirname(""));

// app.set("view engine", "ejs");
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

app.post("/api/gift", async (req, res) => {
	const {product_id, variant_id, username, channel, auth_code} = req.body;
	if ((!product_id) || (!variant_id) || (!username) || (!channel))
	{
		res.status(400).send("product_id, variant_id, username, channel, and auth_code are required");
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
		DB.run(
			"INSERT INTO checkout (token, channel, username, product_id, variant_id, status, auth_code) VALUES(?, ?, ?, ?, ?, ?, ?)",
			[checkout.token, channel, username, product.id, variant.id, "NEW", auth_code],
			(err) => {
				if (!err)
					return
				console.log(err);
				res.status(400).send(err);
			}
		);

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

app.post("/api/claim", async (req, res) => {
	const {checkout_token, channel, winner} = req.body;
	if ((!checkout_token) || (!channel) || (!winner))
	{
		res.status(400).send("checkout_token, channel, and winner are required");
		return
	}

	try
	{
		const data = await new Promise((resolve, reject) => {
			DB.get(
				"SELECT token, channel, username, status FROM checkout WHERE token = ? AND status = ? and channel = ?;",
				[checkout_token, "PAID", channel],
				(err, row) => {
					if (err)
					{
						console.log(err);
						reject();
					}

					if (row)
						resolve(row);

					reject(row);
				}
			)
		});

		console.log(winner);
	}
	catch (e)
	{
		console.log(e);
		res.status(400).send(e);
	}
});

app.get("/api/form", async (req, res) => {
	const protocol = req.protocol;
	const host = req.get("host");
	const url = `${protocol}://${host}/form.html`;
	const data = {
		"form_url": url,
	};
	res.status(200).send(data);
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
