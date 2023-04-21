import {
  Page,
  Layout,
} from "@shopify/polaris";
import { useState } from "react";
import { TitleBar } from "@shopify/app-bridge-react";

export default function FormPage() {
	const [email, setEmail] = useState("");
	const [country, setCountry] = useState("");
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [address, setAddress] = useState("");
	const [apartment, setApartment] = useState("");
	const [postalCode, setPostalCode] = useState("");
	const [city, setCity] = useState("");
	const [region, setRegion] = useState("");
	const [phone, setPhone] = useState("");

	const handle_form_submit = async (event) => {
		event.preventDefault();
		const form_data = {
			email,
			country,
			firstName,
			lastName,
			address,
			apartment,
			postalCode,
			city,
			region,
			phone,
		};
		console.log(form_data);
	};

	//NOTE: (Brandon) - it will be easier if we will create an input component and just reuse them
	//but this is FE and React. I just want to get over with it.

	return (
		<Page narrowWidth>
			<TitleBar title="Form" primaryAction={null} />
			<Layout>
				<Layout.Section>
					<form onSubmit={handle_form_submit}>
						<h3>Contact</h3>
						<div>
							<input type="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
							<label for="floatingInput">Email address</label>
						</div>

						<br/>
						<h3>Shipping Address</h3>
						<div>
							<input type="text" placeholder="Country" value={country} onChange={(event) => setCountry(event.target.value)} />
							<label for="floatingCountry">Country/Region</label>
						</div>

						<div class="row">
							<div class="col">
								<div>
									<input type="text" placeholder="First Name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
									<label for="floatingFirstName">First Name</label>
								</div>
							</div>

							<div class="col">
								<div>
									<input type="text" placeholder="Last Name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
									<label for="floatingLastName">Last Name</label>
								</div>
							</div>
						</div>

						<div>
							<input type="text" placeholder="Address" value={address} onChange={(event) => setAddress(event.target.value)} />
							<label for="floatingAddress">Address</label>
						</div>

						<div>
							<input type="text" placeholder="Apartment, suite, etc. (optional)" value={apartment} onChange={(event) => setApartment(event.target.value)} />
							<label for="floatingApartment">Apartment, suite, etc. (optional)</label>
						</div>

						<div class="row">
							<div class="col">
								<div>
									<input type="text" placeholder="Postal Code" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} />
									<label for="floatingPostalCode">Postal Code</label>
								</div>
							</div>

							<div class="col">
								<div>
									<input type="text"  placeholder="City" value={city} onChange={(event) => setCity(event.target.value)} />
									<label for="floatingCity">City</label>
								</div>
							</div>
						</div>

						<div>
							<input type="text" placeholder="Region" value={region} onChange={(event) => setRegion(event.target.value)} />
							<label for="floatingRegion">Region</label>
						</div>

						<div>
							<input type="text" placeholder="Phone (optional)" value={phone} onChange={(event) => setPhone(event.target.value)} />
							<label for="floatingOptional">Phone (optional)</label>
						</div>

						<br/>

						<button type="submit">Submit</button>

					</form>
				</Layout.Section>
			</Layout>
		</Page>
	);
}
