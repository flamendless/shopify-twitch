import { useState } from "react";
import {
  Card,
  Heading,
  TextContainer,
  DisplayText,
  TextStyle,
} from "@shopify/polaris";
import { Toast } from "@shopify/app-bridge-react";
import { useAppQuery, useAuthenticatedFetch } from "../hooks";

export function ProductsCard() {
  const emptyToastProps = { content: null };
  const [isLoading, setIsLoading] = useState(true);
	const [checkout_url, set_checkout_url] = useState("");
  const [toastProps, setToastProps] = useState(emptyToastProps);
  const fetch = useAuthenticatedFetch();

  const {
    data,
    refetch: refetchProductCount,
    isLoading: isLoadingCount,
    isRefetching: isRefetchingCount,
  } = useAppQuery({
    url: "/api/products/count",
    reactQueryOptions: {
      onSuccess: () => {
        setIsLoading(false);
      },
    },
  });

  const toastMarkup = toastProps.content && !isRefetchingCount && (
    <Toast {...toastProps} onDismiss={() => setToastProps(emptyToastProps)} />
  );

  const handlePopulate = async () => {
    setIsLoading(true);
    const response = await fetch("/api/products/create");

    if (response.ok) {
      await refetchProductCount();
      setToastProps({ content: "5 products created!" });
    } else {
      setIsLoading(false);
      setToastProps({
        content: "There was an error creating products",
        error: true,
      });
    }
  };

	const product_id = 8215969104179;
	const variant_id = 44829754556723;

	const handleGift = async () => {
		set_checkout_url("");
		const response = await fetch(
			"/api/gift?" +
			`product_id=${product_id}&` +
			`variant_id=${variant_id}`
		);

		if (response.ok)
		{
			const data = await response.json();
			set_checkout_url(data.checkout_url);
			setToastProps({ content: "Success" });
		}
		else
		{
			set_checkout_url("");
			setToastProps({
				content: "There was an error in gifting",
				error: true,
			});
		}
	};

  return (
    <>
      {toastMarkup}
      <Card
        title="Product Counter"
        sectioned
        primaryFooterAction={{
          content: "Populate 5 products",
          onAction: handlePopulate,
          loading: isLoading,
        }}
      >
        <TextContainer spacing="loose">
          <p>
            Sample products are created with a default title and price. You can
            remove them at any time.
          </p>
          <Heading element="h4">
            TOTAL PRODUCTS
            <DisplayText size="medium">
              <TextStyle variation="strong">
                {isLoadingCount ? "-" : data.count}
              </TextStyle>
            </DisplayText>
          </Heading>
        </TextContainer>
      </Card>

      <Card
        title="Test Gifting"
        sectioned
        primaryFooterAction={{
          content: "gift",
          onAction: handleGift,
          loading: isLoading,
        }}
      >
        <TextContainer spacing="loose">
			<p>product_id: {product_id}</p>
			<p>variant_id: {variant_id}</p>
			<a href={checkout_url} target="_blank">
				checkout_url: {checkout_url}
			</a>
        </TextContainer>
      </Card>
    </>
  );
}
