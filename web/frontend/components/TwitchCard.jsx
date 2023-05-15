import { useCallback, useEffect, useState } from "react";
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

	const [toastProps, setToastProps] = useState(emptyToastProps);
	const fetch = useAuthenticatedFetch();

	const toastMarkup = toastProps.content && (
		<Toast {...toastProps} onDismiss={() => setToastProps(emptyToastProps)} />
	);

	useEffect(async () => {
		const res = await fetch("/api/register_custom_button");
		if (res.ok)
			console.log(res);
		else
			console.error(res);
	});

	// const handle_change = (e) => { set_channel_name(e.target.value); }
	const handle_change_channel = useCallback((new_value) => set_channel_name(new_value), []);
	const handle_change_username = useCallback((new_value) => set_username(new_value), []);

	const handle_submit = async () => {
		const state = [...Array(30)].map(() => Math.random().toString(36)[2]).join('')
		const store = new URL(window.location).searchParams.get("shop")

		const opt = {
			method: "POST",
			headers: {"Content-Type": "application/json"},
			body: JSON.stringify({
				channel_name: channel_name,
				username: username,
				store: store,
				state: state,
			})
		};
		const res = await fetch("/api/twitch_setup", opt);
		if (res.ok)
		{
			const data = await res.json();
			console.log(data);
			setToastProps({ content: "Success" });
			// const redirect_uri = "https://twitch-dmdn.onrender.com"
			// const redirect_uri = "http://localhost:3000"
			// const url = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=9egbqe7dfh8hb291qvxmhykqamhu29&redirect_uri=${redirect_uri}/api/join&scope=chat%3Aread%20chat%3Aedit%20moderator%3Amanage%3Aannouncements%20user%3Aread%3Abroadcast%20moderation%3Aread&state=${state}`;
			const url = data.link
			window.open(url, "_blank");
		}
		else
		{
			setToastProps({
				content: "There was an error in auth",
				error: true,
			});
		}

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
        }}
      >
		<TextContainer spacing="loose">


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

		</TextContainer>
      </Card>
    </>
  );
}
