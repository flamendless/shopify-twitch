// @ts-check
import { join, resolve, dirname } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import cors from "cors";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import GDPRWebhookHandlers from "./gdpr.js";
import DB from "./db.js";
import utils from "./utils.js";

import * as dotenv from "dotenv";
dotenv.config();


import axios from "axios";
import { channel } from "diagnostics_channel";
import { createUnzip } from "zlib";

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT, 10);
const TWITCH_SERVER = 'http://localhost:3000';
// const TWITCH_SERVER = 'https://twitch-dmdn.onrender.com';

const STATIC_PATH = process.env.NODE_ENV === "production"
	? `${process.cwd()}/frontend/dist`
	: `${process.cwd()}/frontend/`;

const app = express();
const __dirname = resolve(dirname(""));
var sessionToken = null

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

app.use(cors());

const skip_routes = [
	"submit_form",
	"gift",
	"twitch_setup",
	"twitch_auth",
	"get_form",
	"set_winner",
]

async function add_custom_button(req, res)
{
	console.log("adding custom button");
	try
	{
		const session = res.locals.shopify.session;
		const tags = await shopify.api.rest.ScriptTag.all({session: session});

		for (let i = 0; i < tags.data.length; i++)
		{
			await tags.data[i].delete();
		}

		console.log("adding button")

		const sc = new shopify.api.rest.ScriptTag({session: session});
		const host = req.get("host");
		sc.src = `https://${host}/custom_button.js`;
		sc.event = "onload";
		await sc.save({update: true});
	}
	catch (e)
	{
		console.error("Can't add custom button to Online Store", e);
	}
}

function check_skip(param)
{
	for (let i = 0; i < skip_routes.length; i++)
	{
		if (
			(param == skip_routes[i]) ||
			(param == skip_routes[i] + "/")
		)
			return true
	}
	return false
}

const validation = shopify.validateAuthenticatedSession();
app.use("/api/*", async (req, res, next) => {
	if (!(
		(Object.keys(req.params).length == 1) &&
		(check_skip(req.params[0]))
	))
	{
		await validation(req, res, next);
		return
	}

	next();
});

app.get("/api/register_custom_button", async (req, res) => {
	await add_custom_button(req, res);
	res.status(200).send("success");
});

app.use(express.json());

app.post("/api/twitch_auth", async (req, res) => {
	const {channel, auth_code, state} = req.body;

	const exists = await new Promise((resolve, reject) => {
		DB.get(
			"SELECT channel FROM twitch WHERE channel = ?;",
			[channel],
			(err, row) => {
				if (err)
				{
					console.log(err);
					reject();
				}
				console.log("row:"+row)
				resolve(row);
			}
		)
	});

	if (exists)
	{
		const update = await new Promise((resolve, reject) => {
			DB.run(
				"UPDATE twitch SET auth_code = ?, state = ? WHERE channel = ?;",
				[auth_code, state, channel],
				(err) => {
					if (!err)
						resolve(true);

					console.log(err);
					reject();
				}
			)
		});
		console.log("update twitch")
		console.log(update)
		res.status(200).send({message: `updated channel ${channel} ${update}`});
		// res.status(200).send({message: `channel ${channel} was already registered`});
		return
	}

	const result = await new Promise((resolve, reject) => {
		DB.run(
			"UPDATE TABLE twitch SET auth_code = ?, state = ? WHERE channel = ?;",
			[auth_code, state, channel],
			(err) => {
				if (!err)
					resolve(true);

				console.error(err);
				reject();
			}
		)
	});

	if (!result)
	{
		res.status(400).send({message: "Failed to store twitch credentials"});
		return
	}

	res.status(200).send({message: "success"});
});

app.post("/api/twitch_setup", async (req, res) => {
	// res.status(200).send({success:"success"})

	const {channel_name, username, store, state} = req.body;

	// const sessionToken = res.locals.shopify.session;
	const session_token = await utils.get_session_from_db_by_name(store);
	console.log("session token"+session_token?.accessToken)
	try {

		const host = req.get("host");

		await axios({
			method: "GET",
			url: `${TWITCH_SERVER}/api/auth`,
			params: {
				username: username,
				channel: channel_name,
				store: store,
				host:host,
				state: state,
				session:session_token?.accessToken
			}
		}).then(async function (response)
			{
				console.log("sent request auth");
				console.log(response.data);

				// await new Promise((resolve, reject) => {
				// 	DB.run(
				// 		"INSERT INTO twitch (channel, shop) VALUES(?, ?);",
				// 		[channel_name, store],
				// 		(err) => {
				// 			if (err)
				// 			{
				// 				console.error(err);
				// 				reject();
				// 			}
				// 			resolve(true);
				// 		}
				// 	);
				// });

				
				// res.status(200).send(response.data);

				// return

				console.log("check if exist")

				const exists = await new Promise((resolve, reject) => {
					DB.get(
						"SELECT * FROM twitch WHERE channel = ?;",
						[channel_name],
						(err, row) => {
							if (err)
							{
								console.log(err);
								reject();
							}
							console.log("row:"+row)
							resolve(row);
						}
					)
				});
				
			
				if (exists)
				{
					console.log("updating twitch shop")

					await new Promise((resolve, reject) => {
						DB.run(
							"UPDATE twitch SET shop = ? WHERE channel = ?;",
							[channel_name, store],
							(err) => {
								if (err)
								{
									console.log("failed updating twitch shop")
									console.error(err);
									reject();
								}
								resolve(true);
							}
						);
					});

				}else{
					console.log("inserting twitch shop")
					await new Promise((resolve, reject) => {
						DB.run(
							"INSERT INTO twitch (channel, shop) VALUES(?, ?);",
							[channel_name, store],
							(err) => {
								if (err)
								{
									console.error(err);
									reject();
								}
								resolve(true);
							}
						);
					});

				}





				res.status(200).send(response.data);
			}
		).catch(function(err)
			{
				console.log("failed sending request auth");
				console.log(err);
				res.status(400).send({error: err});
			}
		);
	}
	catch(err)
	{
		res.status(400).send({error:err})
	}
});

app.post("/api/gift", async (req, res) => {
	const {variant_id, gifter} = req.body;

	console.log("calling gift")

	if ((!variant_id) || (!gifter))
	{
		res.status(400).send("variant_id,  gifter, and shop are required");
		return
	}

	try
	{
		const shop_name = req.query.shop;
		const session = await utils.get_session_from_db_by_name(shop_name);
		if (!session)
		{
			res.status(400).send("invalid session");
			return
		}

		const twitch_data = await new Promise((resolve, reject) => {
			DB.get(
				"SELECT * FROM twitch where shop = ?;",
				[shop_name],
				(err, row) => {
					if (err)
					{
						console.error(err);
						reject();
					}
					if (!row.channel)
					{
						console.error(`${shop_name} is not valid`);
						reject();
					}
					resolve(row);
				}
			)
		});

		if (!twitch_data)
		{
			console.log("failed gift")
			res.status(400).send("invalid channel");
			return
		}

		const variant = await utils.get_variant(
			session,
			variant_id
		);

		console.log("getting gift")

		// const draft_order = await utils.create_draft_order(session, variant.id);
		const checkout = await utils.create_checkout(session, variant.id);
		const shop_id = session.id;
		const channel = twitch_data.channel;
		
		DB.run(
			"INSERT INTO checkout (token, shop_id, gifter, variant_id, status, channel) VALUES(?, ?, ?, ?, ?, ?)",
			[checkout.token, shop_id, gifter, variant.id, "NEW", channel],
			(err) => {
				if (!err)
					return
				console.log(err);
				res.status(400).send(err);
			}
		);

		console.log("getting gift v2")

		res.status(200).send({
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
						console.error(err);
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
	const {checkout_token, channel, username, order_id, shop_id} = req.body;
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

	if ((status == "CLAIMED"))
	{
		res.status(400).send({message: "This has been already claimed"});
		return
	}
	
	console.log("setting winner")
	const success = await new Promise((resolve, reject) => {
		DB.serialize(() => {
			DB.run("BEGIN TRANSACTION");
			DB.run(
				"INSERT INTO winner (checkout_token, channel, username, status, order_id, shop_id) VALUES(?, ?, ?, ?, ?, ?)",
				[checkout_token, channel, username, "UNCLAIMED", order_id, shop_id],
				(err) => {
					if (err)
					{
						console.log(err);
						DB.run("ROLLBACK");
						reject();
					}
					resolve(true);
				}
			);
			DB.run("COMMIT");
		})
	});

	console.log("success"+success)
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

app.post("/api/get_form", async (req, res) => {
	const {access_token,checkout_token,shop} = req.body;

	let user = null
	await axios({
		method: "GET",
		url: `https://id.twitch.tv/oauth2/validate`,
		headers: {
			'Authorization': 'OAuth '+access_token,
		}
	}).then(async function (response){
		console.log("validating winner");
		//get user
		user = response.data.login
	}).catch(async function(error){
		console.log(error)
		res.status(400).send(error)
	})

	//get orderid,channel and shopid for winner by username
	console.log("user:"+user)
	console.log("checkouttoken:"+checkout_token)
	const data_set = await new Promise((resolve, reject) => {
		DB.get(
			"SELECT * FROM winner WHERE checkout_token = ? AND username = ?",
			[checkout_token, user],
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


	const protocol = req.protocol;
	const host = req.get("host");
	const params = `order_id=${data_set.order_id}&channel=${data_set.channel}`;
	const final_params = utils.encrypt(params);
	const url = `${protocol}://${host}/form.html?data=${final_params}&shop=${shop}&host=${host}`;
	res.status(200).send({
		form_url: url
	});
});

app.post("/api/submit_form", async (req, res) => {
	const data = req.body;
	const undec_data = data.data;
	console.log("submit form post")
	console.log(data.data)
	console.log("unec")
	console.log(undec_data)

	const actual_params = utils.decrypt(undec_data);

	// const params = new URLSearchParams(data.data);
	const params = new URLSearchParams(actual_params);
	console.log(params)
	// const {order_id, channel, shop_id} = params;
	const order_id = params.get("order_id")
	const channel = params.get("channel")
	const shop_id = req.query.shop_id

	console.log(shop_id)
	// console.log(host)

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

				resolve(true);
			}
		)
	});

	if (!row_data)
	{
		res.status(500).send({message: "checkout"+row_data})
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

	console.log("data"+data.address)
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

	const update = await new Promise((resolve, reject) => {
		DB.run(
			"UPDATE checkout SET status = ? WHERE order_id = ? AND channel = ?;",
			["CLAIMED"],
			(err) => {
				if (!err)
					resolve(true);

				console.log(err);
				reject(err);
			}
		)
	});

	try
	{
		await order.save({update: true});
		const host = req.get("host");
		const url = `https://${host}/thankyou.html`;
		res.redirect(url);
	}
	catch(e)
	{
		console.log(e)
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
