import { useState } from "react";
import {
  Card,
  TextContainer,
} from "@shopify/polaris";
import { Toast } from "@shopify/app-bridge-react";
import { useAppQuery, useAuthenticatedFetch } from "../hooks";

export function TwitchCard() {
	const emptyToastProps = { content: null };
	const [is_loading, set_is_loading] = useState(true);
	const [channel_name, set_channel_name] = useState("");

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

	const handle_submit = async () => {
		const url = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=9egbqe7dfh8hb291qvxmhykqamhu29&redirect_uri=http://localhost:3000/join&scope=chat%3Aread%20chat%3Aedit%20moderator%3Amanage%3Aannouncements%20user%3Aread%3Abroadcast%20moderation%3Aread&state=${channel_name}`;
		window.open(url, "_blank");
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
		</TextContainer>
      </Card>
    </>
  );
}
