import { SquareClient, SquareEnvironment } from "square";

export function getSquareClient(): SquareClient {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("SQUARE_ACCESS_TOKEN environment variable is required");
  }
  return new SquareClient({
    token: accessToken,
    environment: SquareEnvironment.Production,
  });
}

export function getSquareLocationId(): string {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) {
    throw new Error("SQUARE_LOCATION_ID environment variable is required");
  }
  return locationId;
}
