import { useCallback, useState } from "react";
import {
	Card,
	TextContainer,
	TextField,
} from "@shopify/polaris";
import { Toast } from "@shopify/app-bridge-react";
import { useAppQuery, useAuthenticatedFetch } from "../hooks";

export function TwitchCard() {
	const emptyToastProps = { content: null };
	const [is_loading, set_is_loading] = useState(true);
	const [channel_name, set_channel_name] = useState("");
	const [username, set_username] = useState("");
	const [store, set_store] = useState("");

	const [toastProps, setToastProps] = useState(emptyToastProps);
	const fetch = useAuthenticatedFetch();

	const {
		data,
		isRefetching: isRefetchingCount,
	} = useAppQuery({
		url: "/api/products/count",
		reactQueryOptions: {
			onSuccess: () => {
				set_is_loading(false);
			},
		},
	});

	const toastMarkup = toastProps.content && !isRefetchingCount && (
		<Toast {...toastProps} onDismiss={() => setToastProps(emptyToastProps)} />
	);

	const handle_change = (e) => { set_channel_name(e.target.value); }
	const handle_change_channel = useCallback((new_value) => set_channel_name(new_value), []);
	const handle_change_username = useCallback((new_value) => set_username(new_value), []);
	const handle_change_store = useCallback((new_value) => set_store(new_value), []);

	const handle_submit = async () => {
		const url = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=9egbqe7dfh8hb291qvxmhykqamhu29&redirect_uri=http://localhost:3000/join&scope=chat%3Aread%20chat%3Aedit%20moderator%3Amanage%3Aannouncements%20user%3Aread%3Abroadcast%20moderation%3Aread&state=${channel_name}`;
		window.open(url, "_blank");

		const opt = {
			method: "POST",
			headers: {"Content-Type": "application/json"},
			body: JSON.stringify({
				channel_name: channel_name,
				username: username,
				store: store,
			})
		};
		const res = await fetch("/api/twitch_setup", opt);
		if (res.ok)
		{
			const data = await res.json();
			console.log(data);
			setToastProps({ content: "Success" });
		}
		else
		{
			setToastProps({
				content: "There was an error in auth",
				error: true,
			});
		}

		// await axios({
		// 	method: "GET",
		// 	url: "http://localhost:3000/api/setup",
		// 	params: {
		// 		channel: channel_name,
		// 		username: username,
		// 		store: store,
		// 	}
		// }).then(async function (res)
		// 	{
		// 		console.log("sent request auth");
		// 		console.log(res.data);
		// 	}
		// ).catch(function(err)
		// 	{
		// 		console.log("failed sending request auth");
		// 		console.log(err.response.data);
		// 	}
		// );
	};

  return (
    <>
      {toastMarkup}

      <Card
        title="Test Gifting"
        sectioned
        primaryFooterAction={{
          content: "auth",
          onAction: handle_submit,
          loading: is_loading,
        }}
      >
		<TextContainer spacing="loose">
			<input
				required
				type="text"
				id="channel_name"
				placeholder="Twitch Channel Name"
				value={channel_name}
				onChange={handle_change}
			/>

			<TextField
				label="Channel name"
				value={channel_name}
				onChange={handle_change_channel}
				autoComplete="off"
			/>

			<TextField
				label="Username"
				value={username}
				onChange={handle_change_username}
				autoComplete="off"
			/>

			<TextField
				label="Store name"
				value={store}
				onChange={handle_change_store}
				autoComplete="off"
			/>
		</TextContainer>
      </Card>
    </>
  );
}
