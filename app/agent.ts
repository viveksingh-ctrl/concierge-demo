import { ConciergeAgent, ContentstackRegion } from "@contentstack/agents-sdk";

// Create the agent ONCE at module scope (per the SDK docs). It holds
// conversation history per userId + threadId in memory — creating a new one
// per request would lose that history.
const region =
  process.env.CONCIERGE_REGION === "AWS_NA"
    ? ContentstackRegion.AWS_NA
    : ContentstackRegion.AZURE_EU;

if (!process.env.CONCIERGE_API_KEY) {
  throw new Error("CONCIERGE_API_KEY is not set (see .env.local)");
}

export const agent = new ConciergeAgent({
  apiKey: process.env.CONCIERGE_API_KEY,
  region,
  platform: "Next.js Demo",
});

// The default user id the agent expects, unless the client supplies one.
export const DEFAULT_USER_ID = process.env.CONCIERGE_USER_ID;
