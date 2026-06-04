---
name: Square SDK patterns
description: Correct import names and API method paths for the square npm package (v44+)
---

The `square` npm package (v44+) exports differently from older versions:

```ts
import { SquareClient, SquareEnvironment } from "square";
const client = new SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN, environment: SquareEnvironment.Production });
```

**NOT** `Client` or `Environment` — those don't exist.

Key API paths:
- Payment links: `client.checkout.paymentLinks.create({ idempotencyKey, quickPay: { name, priceMoney: { amount: BigInt, currency }, locationId }, checkoutOptions, prePopulatedData })`
- Response shape: `response.paymentLink` (NOT `response.result.paymentLink`)
- Orders: `client.orders.get({ orderId })` → `response.order` (NOT `retrieveOrder`, NOT `result.order`)

**Why:** The SDK was fully rewritten for v40+ with a new codegen-based client. All the old `*Api` namespaces (e.g. `checkoutApi`, `ordersApi`) are gone.

**How to apply:** Any time Square SDK is used in this project, use these patterns. If in doubt, check `node_modules/square/Client.d.ts` for current property names.
