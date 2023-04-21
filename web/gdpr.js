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

			DB.run(
				"INSERT INTO webhook (webhook_id) VALUES(?)",
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
					"SELECT channel, gifter, product_id, variant_id, status, auth_code FROM checkout WHERE token = ?;",
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

			const {channel, gifter, product_id, variant_id, status, auth_code} = data;

			if (status == "CLAIMED")
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

			const session = await utils.get_session_from_shop(shop);
			const {product, variant} = await utils.get_product_variant(
				session,
				product_id,
				variant_id
			);

			const res = await axios.post(
				`${process.env.TWITCH_URL}/announcement`,
				{
					message: "NEW GIVEAWAY",
					channel: channel,
					gifter: gifter,
					product_name: product.name,
					variant_name: variant.name,
					checkout_token: token,
					order_id: order_id,
					auth_code: auth_code,
				}
			);
			console.log("res", res);
		}
	},
};
