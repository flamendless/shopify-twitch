import { DeliveryMethod } from "@shopify/shopify-api";
import DB from "./db.js";
import utils from "./utils.js";
import shopify from "./shopify.js";

import axios from "axios";

function log_topic(topic) { console.log(`webhook received: ${topic}`); }

export default {
	CUSTOMERS_DATA_REQUEST: {
		deliveryMethod: DeliveryMethod.Http,
		callbackUrl: "/api/webhooks",
		callback: async (topic, shop, body, webhook_id) => {
			// const payload = JSON.parse(body);
		},
	},

	CUSTOMERS_REDACT: {
		deliveryMethod: DeliveryMethod.Http,
		callbackUrl: "/api/webhooks",
		callback: async (topic, shop, body, webhook_id) => {
			// const payload = JSON.parse(body);
		},
	},

	SHOP_REDACT: {
		deliveryMethod: DeliveryMethod.Http,
		callbackUrl: "/api/webhooks",
		callback: async (topic, shop, body, webhook_id) => {
			// const payload = JSON.parse(body);
		},
	},

	ORDERS_CREATE: {
		deliveryMethod: DeliveryMethod.Http,
		callbackUrl: "/api/webhooks",
		callback: async (topic, shop, body, webhook_id) => {
			// log_topic(topic);
			// const payload = JSON.parse(body);
			// console.log(payload);
		}
	},

	ORDERS_PAID: {
		deliveryMethod: DeliveryMethod.Http,
		callbackUrl: "/api/webhooks",
		callback: async (topic, shop, body, webhook_id) => {
			log_topic(topic);
			const payload = JSON.parse(body);

			const valid = await new Promise((resolve, reject) => {
				DB.get(
					"SELECT id FROM webhook WHERE id = ?;",
					[webhook_id],
					(err, row) => {
						if (err)
						{
							console.log(err);
							reject();
						}

						if (row)
						{
							console.log(`webhook ${webhook_id} was already processed`);
							reject();
						}

						resolve(true);
					}
				);
			});

			if (!valid)
				return

			console.log("inserting")
			DB.run(
				"INSERT INTO webhook (id) VALUES(?)",
				[webhook_id],
				(err) => {
					if (!err)
						return
					console.log(err);
				}
			);

			const token = payload.checkout_token;

			const data = await new Promise((resolve, reject) => {
				DB.get(
					"SELECT shop_id, gifter, variant_id, status, checkout, channel FROM checkout WHERE token = ?;",
					[token],
					(err, row) => {
						if (err)
						{
							console.log(`${token} is invalid`);
							reject();
						}
						resolve(row);
					}
				);
			});

			if (!data)
				return

			const {shop_id, gifter, variant_id, status, channel} = data;

			if (status != "NEW")
			{
				console.log(`${token} was already claimed`);
				return
			}

			const order_id = payload.id;
			DB.run(
				"UPDATE checkout SET order_id = ?, status = ? WHERE token = ?",
				[order_id, "PAID", token],
				(err) => {
					if (!err)
						return
					console.log(err);
				}
			);

			console.log("getting shop name in orderpaid webhook")
			const shop_name = shop;
			const session = await utils.get_session_from_shop(shop_name);
			const variant = await utils.get_variant(
				session,
				variant_id
			);

			console.log("getting auth and state")
			//get state and access_token
			const data_set = await new Promise((resolve, reject) => {
				DB.get(
					"SELECT auth_code, state, channel FROM twitch WHERE channel = ?;",
					[channel],
					(err, row) => {
						if (err)
						{
							console.error(`${token} is invalid`);
							reject();
						}
						resolve(row);
					}
				);
			});

			console.log("announcing give away")
			console.log(data_set)
			const res = await axios.get(
				`http://localhost:3000/api/announce-giveaway`,
				{
					shop_id: shop_id,
					gifter: gifter,
					product: variant.name,
					checkout_token: token,
					order_id: order_id,
					state: data_set.state,
					access_token: data_set.auth_code,
					channel: channel,
				}
			);
			console.log("res", res);
		}
	},
};
