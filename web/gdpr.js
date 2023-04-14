import { DeliveryMethod } from "@shopify/shopify-api";

// import axios from "axios";

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
		callback: async (topic, shop, body, webhookId) => {
			log_topic(topic);
			const payload = JSON.parse(body);
			console.log(payload);
		}
	},

	ORDERS_PAID: {
		deliveryMethod: DeliveryMethod.Http,
		callbackUrl: "/api/webhooks",
		callback: async (topic, shop, body, webhookId) => {
			log_topic(topic);
			const payload = JSON.parse(body);
			console.log(payload);

			// const res = await axios.post(
			// 	`${process.env.TWITCH_URL}/announcement`,
			// 	{
			// 		username: 
			// 	}
			// );
			// console.log(res);
		}
	},
};
