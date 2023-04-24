import {
  Page,
  Layout,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { TwitchCard } from "../components";

export default function HomePage() {
  return (
    <Page narrowWidth>
      <TitleBar title="Shopify Twitch Gifting" primaryAction={null} />
      <Layout>
        <Layout.Section>
          <TwitchCard />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
