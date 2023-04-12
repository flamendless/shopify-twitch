// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import { restResources } from "@shopify/shopify-api/rest/admin/2023-04";
import productCreator from "./product-creator.js";

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

app.use(
	"/api/*",
	shopify.validateAuthenticatedSession(),
	async (req, res) => {
		// const session_id = await shopify.api.session.getCurrentId({
		// 	rawRequest: req,
		// 	rawResponse: res,
		// });
		// const session = await shopify.config.sessionStorage.loadSession(session_id);
		// const client = new shopify.api.clients.Rest({session});
		// shopify.api.clients.Rest = client;
		// shopify.api.rest = restResources;
		res.status(200).send({ success: true });
	}
);

app.use(express.json());

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
