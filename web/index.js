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

const validation = shopify.validateAuthenticatedSession();
app.use("/api/*", async (req, res, next) => {
	if (!((Object.keys(req.params).length == 1) && (req.params[0] == "submit_form")))
		return validation(req, res, next);
	next();
});

app.use(express.json());

app.post("/api/store_twitch", async (req, res) => {
	const {client_id, login, scopes, user_id, expires_in} = req.query;
	res.status(200).send();
});

app.post("/api/gift", async (req, res) => {
	const {product_id, variant_id, gifter, channel, auth_code} = req.body;
	if ((!product_id) || (!variant_id) || (!gifter) || (!channel))
	{
		res.status(400).send("product_id, variant_id, gifter, channel, and auth_code are required");
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
		const shop_id = session.id;
		DB.run(
			"INSERT INTO checkout (token, shop_id, channel, gifter, product_id, variant_id, status, auth_code) VALUES(?, ?, ?, ?, ?, ?, ?, ?)",
			[checkout.token, shop_id, channel, gifter, product.id, variant.id, "NEW", auth_code],
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
			shop_id: shop_id,
			gifter: gifter,
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
				"SELECT token, channel, gifter, status FROM checkout WHERE token = ? AND status = ? AND channel = ?;",
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

app.post("/api/set_winner", async (req, res) => {
	const {checkout_token, channel, username} = req.body;
	if (!checkout_token || !channel || !username)
	{
		res.status(400).send({message: "Missing parameter"});
		return
	}

	const status = await new Promise((resolve, reject) => {
		DB.get(
			"SELECT status FROM winner WHERE checkout_token = ?",
			[checkout_token],
			(err, row) => {
				if (err)
				{
					console.log(err);
					reject();
				}
				resolve(row);
			}
		)
	});

	if ((!status) || (status == "CLAIMED"))
	{
		res.status(400).send({message: "This has been already claimed"});
		return
	}

	const success = await new Promise((resolve, reject) => {
		DB.serialize(() => {
			DB.run("BEGIN TRANSACTION");
			DB.run(
				"INSERT INTO winner (checkout_token, channel, username, status) VALUES(?, ?, ?, ?)",
				[checkout_token, channel, username, "UNCLAIMED"],
				(err, row) => {
					if (err)
					{
						console.log(err);
						DB.run("ROLLBACK");
						reject();
					}
					resolve(row);
				}
			);
			DB.run("COMMIT");
		})
	});

	if (!success)
	{
		res.status(500).send({
			message: "Failed to insert winner in the database. Please try again"
		});
		return
	}

	res.status(200).send({
		message: "successful",
		checkout_token: checkout_token,
		channel: channel,
		username: username,
	});
})

app.get("/api/get_form", async (req, res) => {
	const {order_id, channel, shop_id} = req.query;
	const protocol = req.protocol;
	const host = req.get("host");
	const url = `
		${protocol}://${host}/form.html
		?order_id=${order_id}&
		channel=${channel}&
		shop_id=${shop_id}
	`;
	const data = {
		"form_url": url,
	};
	res.status(200).send(data);
});

app.post("/api/submit_form", async (req, res) => {
	const data = req.body;
	const {order_id, channel, shop_id} = data;

	const row_data = await new Promise((resolve, reject) => {
		DB.get(
			"SELECT order_id, status, channel FROM checkout WHERE order_id = ? AND channel = ?",
			[order_id, channel],
			(err, row) => {
				if (err)
				{
					console.log(err);
					reject(err);
				}

				if (row && row.status == "CLAIMED")
				{
					console.log(err);
					reject("Already claimed");
				}

				resolve(row);
			}
		)
	});

	if (!row_data)
	{
		res.status(500).send({message: row_data})
		return
	}

	const session = await utils.get_session_from_db(shop_id);
	const order = await shopify.api.rest.Order.find({
		session: session,
		id: order_id,
	});
	if (!order)
	{
		res.status(400).send({message: "Invalid order id"});
		return
	}
	order.shipping_address = {
		address1: data.address,
		address2: data.apartment,
		city: data.city,
		country: data.country,
		first_name: data.first_name,
		last_name: data.last_name,
		phone: data.phone,
		province: data.region,
		zip: data.postal_code,
	}

	try
	{
		await order.save({update: true});
		res.status(200).send({message: "success"});
	}
	catch
	{
		res.status(500).send({message: "error with updating shipping address"});
	}
});

app.get("/api/products/count", async (_req, res) => {
	// const countData = await shopify.api.rest.Product.count({
	// 	session: res.locals.shopify.session,
	// });
	res.status(200).send({count: 100});
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
