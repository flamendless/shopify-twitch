import shopify from "./shopify.js";
import DB from "./db.js";

// class Session {
//     constructor(params) {
//         Object.assign(this, params);
//     }
//     static fromPropertyArray(entries) {
//         if (!Array.isArray(entries)) {
//             throw new error_1.InvalidSession('The parameter is not an array: a Session cannot be created from this object.');
//         }
//         const obj = Object.fromEntries(entries
//             .filter(([_key, value]) => value !== null && value !== undefined)
//             // Sanitize keys
//             .map(([key, value]) => {
//             switch (key.toLowerCase()) {
//                 case 'isonline':
//                     return ['isOnline', value];
//                 case 'accesstoken':
//                     return ['accessToken', value];
//                 case 'onlineaccessinfo':
//                     return ['onlineAccessInfo', value];
//                 default:
//                     return [key.toLowerCase(), value];
//             }
//         })
//             // Sanitize values
//             .map(([key, value]) => {
//             switch (key) {
//                 case 'isOnline':
//                     if (typeof value === 'string') {
//                         return [key, value.toString().toLowerCase() === 'true'];
//                     }
//                     else if (typeof value === 'number') {
//                         return [key, Boolean(value)];
//                     }
//                     return [key, value];
//                 case 'scope':
//                     return [key, value.toString()];
//                 case 'expires':
//                     return [key, value ? new Date(Number(value)) : undefined];
//                 case 'onlineAccessInfo':
//                     return [
//                         key,
//                         {
//                             associated_user: {
//                                 id: Number(value),
//                             },
//                         },
//                     ];
//                 default:
//                     return [key, value];
//             }
//         }));
//         Object.setPrototypeOf(obj, Session.prototype);
//         return obj;
//     }
//     isActive(scopes) {
//         const scopesObject = scopes instanceof scopes_1.AuthScopes ? scopes : new scopes_1.AuthScopes(scopes);
//         const scopesUnchanged = scopesObject.equals(this.scope);
//         if (scopesUnchanged &&
//             this.accessToken &&
//             (!this.expires || this.expires >= new Date())) {
//             return true;
//         }
//         return false;
//     }
//     toObject() {
//         const object = {
//             id: this.id,
//             shop: this.shop,
//             state: this.state,
//             isOnline: this.isOnline,
//         };
//         if (this.scope) {
//             object.scope = this.scope;
//         }
//         if (this.expires) {
//             object.expires = this.expires;
//         }
//         if (this.accessToken) {
//             object.accessToken = this.accessToken;
//         }
//         if (this.onlineAccessInfo) {
//             object.onlineAccessInfo = this.onlineAccessInfo;
//         }
//         return object;
//     }
//     equals(other) {
//         if (!other)
//             return false;
//         const mandatoryPropsMatch = this.id === other.id &&
//             this.shop === other.shop &&
//             this.state === other.state &&
//             this.isOnline === other.isOnline;
//         if (!mandatoryPropsMatch)
//             return false;
//         const copyA = this.toPropertyArray();
//         copyA.sort(([k1], [k2]) => (k1 < k2 ? -1 : 1));
//         const copyB = other.toPropertyArray();
//         copyB.sort(([k1], [k2]) => (k1 < k2 ? -1 : 1));
//         return JSON.stringify(copyA) === JSON.stringify(copyB);
//     }
//     toPropertyArray() {
//         return (Object.entries(this)
//             .filter(([key, value]) => propertiesToSave.includes(key) &&
//             value !== undefined &&
//             value !== null)
//             // Prepare values for db storage
//             .map(([key, value]) => {
//             var _a;
//             switch (key) {
//                 case 'expires':
//                     return [key, value ? value.getTime() : undefined];
//                 case 'onlineAccessInfo':
//                     return [key, (_a = value === null || value === void 0 ? void 0 : value.associated_user) === null || _a === void 0 ? void 0 : _a.id];
//                 default:
//                     return [key, value];
//             }
//         }));
//     }
// }

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

	static async get_session_from_db(shop_id)
	{
		const row = await new Promise((resolve, reject) => {
			DB.get(
				"SELECT * from shopify_sessions WHERE id = ?",
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

		const session_data = {
			id: shop_id,
			shop: row.shop,
			state: row.state,
			isOnline: row.isOnline == 1 ? true : false,
			scope: row.scope,
			accessToken: row.accessToken,
		};

		// const session = new Session(session_data);
		const session = this.get_session_from_shop(row.shop);
		// const session_id = shopify.api.session.getOfflineId(row.shop);
		// const session = await shopify.config.sessionStorage.loadSession(session_id);
		return session
	}
}

export default Utils;
