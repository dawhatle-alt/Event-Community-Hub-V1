import { SquareClient, SquareEnvironment } from "square";

export function getSquareClient(): SquareClient {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("SQUARE_ACCESS_TOKEN environment variable is required");
  }
  const env = (process.env.SQUARE_ENVIRONMENT ?? "sandbox").toLowerCase();
  const environment =
    env === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox;
  return new SquareClient({
    token: accessToken,
    environment,
  });
}

export function getSquareLocationId(): string {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) {
    throw new Error("SQUARE_LOCATION_ID environment variable is required");
  }
  return locationId;
}
