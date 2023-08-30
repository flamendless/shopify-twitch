import crypto from "crypto";

import shopify from "./shopify.js";
import DB from "./db.js";

const IV = crypto.randomBytes(16);

class Utils
{

	static async get_variant(session, variant_id)
	{
		const variant = await shopify.api.rest.Variant.find({
			session: session,
			id: variant_id,
		});
		if (!variant)
			throw "variant not found";

		return variant;
	}

	static async get_product(session, product_id)
	{
		const product = await shopify.api.rest.Product.find({
			session: session,
			id: product_id,
		});
		if (!product)
			throw "product not found";

		return product;
	}

	static async create_checkout(session, variant_id)
	{
		const checkout = new shopify.api.rest.Checkout({session: session});
		checkout.line_items = [
			{
				"variant_id": variant_id,
				"quantity": 1
			}
		];
		await checkout.save({update: true});
		return checkout;
	}

	static async create_draft_order(session, variant_id)
	{
		const draft_order = new shopify.api.rest.DraftOrder({session: session});
		draft_order.line_items = [
			{
				"variant_id": variant_id,
				"quantity": 1
			}
		];
		await draft_order.save();
		return draft_order;
	}

	static async get_session_from_shop(shop)
	{
		const session_id = shopify.api.session.getOfflineId(shop);
		const session = await shopify.config.sessionStorage.loadSession(session_id);
		return session
	}

	static async get_session_from_db(shop_id)
	{
		console.log(shop_id)
		const row = await new Promise((resolve, reject) => {
			DB.get(
				"SELECT shop from shopify_sessions WHERE shop = ?",
				[shop_id],
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
		const {shop} = row
		// const session_data = {
		// 	id: shop_id,
		// 	shop: row.shop,
		// 	state: row.state,
		// 	isOnline: row.isOnline == 1 ? true : false,
		// 	scope: row.scope,
		// 	accessToken: row.accessToken,
		// };

		// const session = new Session(session_data);
		const session = this.get_session_from_shop(shop);
		// const session_id = shopify.api.session.getOfflineId(row.shop);
		// const session = await shopify.config.sessionStorage.loadSession(session_id);
		return session
	}

	static async get_session_from_db_by_name(shop_name)
	{
		const row = await new Promise((resolve, reject) => {
			DB.get(
				"SELECT * from shopify_sessions WHERE shop = ?",
				[shop_name],
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

		if (!row)
		{
			console.log(`no shop ${shop_name} found in database`);
			return
		}

		// const session_data = {
		// 	id: row.id,
		// 	shop: row.shop,
		// 	state: row.state,
		// 	isOnline: row.isOnline == 1 ? true : false,
		// 	scope: row.scope,
		// 	accessToken: row.accessToken,
		// };

		return this.get_session_from_shop(row.shop);
	}

	static encrypt(str)
	{
		const iv = IV.toString("hex").slice(0, 16);
		const cipher = crypto.createCipheriv(
			process.env.ALGO,
			process.env.SECRET,
			iv,
		);
		const enc = Buffer.concat([cipher.update(str), cipher.final()]);
		const str_enc = enc.toString("hex");
		return str_enc
	}

	static decrypt(str)
	{
		const iv = IV.toString("hex").slice(0, 16);
		const decipher = crypto.createDecipheriv(
			process.env.ALGO,
			process.env.SECRET,
			iv,
		);
		const dec = Buffer.concat([
			decipher.update(Buffer.from(str, "hex")),
			decipher.final()
		]);
		const str_dec = dec.toString();
		return str_dec
	}
}

export default Utils;
