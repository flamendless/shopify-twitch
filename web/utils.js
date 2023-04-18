import shopify from "./shopify.js";

class Utils
{
	static async get_product_variant(session, product_id, variant_id)
	{
		let product, variant;

		product = await shopify.api.rest.Product.find({
			session: session,
			id: product_id,
		});
		if ((!product) || (!product.published_at))
			throw "product not found";


		if ((!product.variants) || (product.variants?.length == 0))
			return {product, variant};

		for (const e of product.variants)
		{
			if (e.id == variant_id)
			{
				variant = e;
				break
			}
		}
		if (!variant)
			throw "variant not found";

		return {product, variant};
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
}

export default Utils;
