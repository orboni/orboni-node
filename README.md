# Orboni for Node.js

The official Node.js and TypeScript library for the [Orboni API](https://orboni.com/docs): take crypto payments — USDT, USDC, BTC, ETH and more — paid straight to your own wallets. Orboni never holds your money.

- Every API call, typed: checkout sessions, payment links, refunds, events, payment methods and currencies.
- Webhook signatures verified with Web Crypto, so it runs in Node.js, Deno, Bun and edge runtimes.
- Safe retries: each POST carries an idempotency key, and network failures, `409`, `429` and `5xx` are tried again.
- No dependencies. Node.js 20 or later; ESM and CommonJS.

## Install

```bash
npm install orboni
```

## Take a payment

Make a checkout session on your server and send the buyer to its `url`. Amounts are in the currency's smallest unit (cents, or whole yen).

```ts
import Orboni from 'orboni';

const orboni = new Orboni(process.env.ORBONI_SECRET_KEY); // sk_test_… or sk_live_…

const session = await orboni.checkout.sessions.create(
    {
        amount: 2500,
        currency: 'usd',
        client_reference_id: 'order_1042',
        success_url: 'https://your-store.example/orders/1042',
        cancel_url: 'https://your-store.example/cart',
        metadata: { order_id: '1042' },
    },
    { idempotencyKey: 'order_1042' },
);

// redirect the buyer to session.url
```

The buyer picks a coin on Orboni's payment page and pays from any wallet or exchange. Fulfil the order when the `checkout.session.completed` webhook arrives, or read the session back:

```ts
const paid = await orboni.checkout.sessions.retrieve(session.id);
if (paid.status === 'complete' && paid.payment_status === 'paid') {
    // fulfil order 1042
}
```

With CommonJS: `const { Orboni } = require('orboni');`.

## Webhooks

Orboni signs every webhook with your endpoint's signing secret (`whsec_…`, under Developers → Webhooks in the dashboard). Verify it against the **raw** body, before any JSON parser touches it:

```ts
import express from 'express';
import Orboni, { SignatureVerificationError } from 'orboni';

const orboni = new Orboni(process.env.ORBONI_SECRET_KEY);
const app = express();

app.post('/webhooks/orboni', express.raw({ type: 'application/json' }), async (req, res) => {
    let event;
    try {
        event = await orboni.webhooks.constructEvent(req.body, req.headers['webhook-signature'], process.env.ORBONI_WEBHOOK_SECRET);
    } catch (error) {
        if (error instanceof SignatureVerificationError) {
            return res.status(400).send(error.message);
        }
        throw error;
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object; // fulfil session.client_reference_id once
    }
    res.sendStatus(200);
});
```

In a Next.js route handler or any Fetch API server, pass `await request.text()` and `request.headers.get('webhook-signature')`.

The same event can arrive more than once and out of order: keep the `id`s you have handled. In production, ignore events whose `livemode` is `false`. While you roll a signing secret, pass both: `constructEvent(body, header, [newSecret, oldSecret])`. Verifying needs no API key: `new Webhooks().constructEvent(…)` works too.

## Lists

A list call is one page when awaited, and every object across the pages when iterated:

```ts
const page = await orboni.checkout.sessions.list({ limit: 10, status: 'complete' });
console.log(page.data, page.has_more);

for await (const refund of orboni.refunds.list({ checkout_session: 'cs_live_…' })) {
    console.log(refund.id, refund.amount);
}

const recent = await orboni.events.list({ created: { gte: 1767225600 } }).autoPagingToArray({ limit: 500 });
```

## Everything else

```ts
await orboni.checkout.sessions.expire('cs_live_…'); // an order cancelled on your side

const link = await orboni.paymentLinks.create({ amount: 1500, currency: 'eur', description: 'Workshop ticket' });
await orboni.paymentLinks.update(link.id, { active: false });

// Orboni holds no money: send the refund from your wallet, then record it
await orboni.refunds.create({ checkout_session: 'cs_live_…', amount: 1000, reason: 'requested_by_customer', transaction: '0x…' });

await orboni.events.resend('evt_…');
const methods = await orboni.paymentMethods.list({ amount: 2500, currency: 'usd' });
const currencies = await orboni.currencies.list();
```

The parameters and fields of each call are in the [API reference](https://orboni.com/docs), and your editor shows them from the types.

## Errors

A refused call throws an `OrboniError` subclass named after the API's error `type`. Branch on the class or on `type`, never on the message:

| Class | `type` | When |
| --- | --- | --- |
| `InvalidRequestError` | `invalid_request_error` | A bad parameter (`param` names it), or no such object (`statusCode` 404) |
| `AmountTooSmallError` | `amount_too_small` | Under the minimum of every network the session could be paid on |
| `IdempotencyError` | `idempotency_error` | An idempotency key reused with other parameters |
| `AuthenticationError` | `authentication_error` | No key, a wrong one or a revoked one |
| `PermissionError` | `permission_error` | A suspended or closed account, or a live key before the email is confirmed |
| `ReceivingFrozenError` | `receiving_frozen` | Receiving is frozen: live keys only read |
| `AccountPastDueError` | `account_past_due` | An Orboni invoice is past due (live only) |
| `RateLimitError` | `rate_limit_error` | Too many requests; `retryAfter` says how many seconds to wait |
| `RateUnavailableError` | `rate_unavailable` | No current exchange rate for the currency |
| `APIError` | `api_error` | Orboni's side; safe to retry with the same idempotency key |
| `ConnectionError` | `connection_error` | No answer: the network failed or the call timed out |

```ts
import { AmountTooSmallError, InvalidRequestError } from 'orboni';

try {
    await orboni.checkout.sessions.create({ amount: 50, currency: 'usd' });
} catch (error) {
    if (error instanceof AmountTooSmallError) {
        // offer another way to pay
    } else if (error instanceof InvalidRequestError) {
        console.log(error.param, error.message);
    } else {
        throw error;
    }
}
```

## Configuration

```ts
const orboni = new Orboni(process.env.ORBONI_SECRET_KEY, {
    timeout: 30_000, // ms per try
    maxRetries: 2, // after the first try
});

// per call
await orboni.checkout.sessions.retrieve('cs_live_…', { timeout: 5_000, maxRetries: 0, signal: controller.signal });
```

Without `idempotencyKey` the library makes one for each POST, so its own retries never create a second session or refund. Pass your own (an order ID is a good one) to make retries of your own safe too: Orboni keeps a successful answer for 24 hours and gives it again for the same key.

## Test mode

A test key (`sk_test_…`) makes test sessions that take no real money. Open a test session's payment page while signed in to the dashboard and press **Simulate payment** to see the whole flow, webhooks included. `orboni.testMode` says which kind of key a client has. See [Testing](https://orboni.com/docs/testing).

## License

MIT
