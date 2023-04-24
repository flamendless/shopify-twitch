function main()
{
	const pathname = window.location.pathname;
	const paths = pathname.split("/");

	if (!((paths.length >= 1) && (paths[1] == "products")))
	{
		console.warn("Can't add custom button. Product page path is unhandled");
		return
	}

	const product_forms = document.querySelectorAll("product-form");
	if (product_forms.length == 0)
	{
		console.warn("Can't add custom button. No product-form element found");
		return
	}

	const form = product_forms[0].querySelector("form");
	if (!form)
	{
		console.warn("Can't add custom button. No product-form.form element found");
		return
	}

	const hidden = form.querySelector("input[name='id']");
	if (!hidden)
	{
		console.warn("Can't add custom button. No product-form.form.input for variant_id found");
		return
	}
	const variant_id = hidden.value;

	let hostname, search;
	const scripts = document.querySelectorAll("head script[type='text/javascript']")
	for (let i = 0; i < scripts.length; i++)
	{
		const script = scripts[i];
		const url = new URL(script.src);
		if (url.search && (url.pathname == "/custom_button.js"))
		{
			hostname = url.hostname;
			search = url.search;
			break
		}
	}

	if (!hostname || !search)
	{
		console.warn("Can't add custom button. Invalid hostname or search.");
		return
	}


	const button = document.createElement("button");
	button.textContent = "Gift Now";
	button.type = "button";
	button.style.marginTop = "1rem";
	button.classList.add(
		"shopify-payment-button__button",
		"shopify-payment-button__button--unbranded"
	)

	button.onclick = async function(e)
	{
		e.preventDefault();
		const data = {
			"variant_id": variant_id,
			"gifter": "test",
			"channel": "channel",
			"auth_code": "auth_code",
		};
		const response = await fetch(`https://${hostname}/api/gift/${search}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
			body: JSON.stringify(data),
		});

		if (response.ok)
		{
			const data = await response.json()
			window.location.href = data.checkout_url;
		}
		else
		{
			console.log(response);
		}
	}

	form.appendChild(button);
}

main()
