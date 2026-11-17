// Generated from https://orboni.com/openapi.json by scripts/gen-types.mjs. Do not edit.

/** Every error, in Stripe’s shape. Branch on `type` (and the status), never on `message`, whose words may change. */
export interface ErrorResponse {
    error: {
        /** `invalid_request_error` (400, 404, 413, 422): a bad parameter — `param` names it —, no such object or URL, or a body too large. `idempotency_error` (400, 409): an `Idempotency-Key` reused with other parameters, or its first request still running. `authentication_error` (401): no key, a wrong one or a revoked one. `permission_error` (403): a suspended or closed account, or a live key before the account’s email is confirmed. `receiving_frozen` (403): live keys only read while the owner has frozen receiving. `account_past_due` (402): live only, an Orboni invoice is past due. `amount_too_small` (422): under the minimum of every network the session could be paid on. `rate_limit_error` (429): too many requests or open sessions; wait `Retry-After` seconds. `rate_unavailable` (503): no current exchange rate for the price’s currency. `api_error` (500, 503): ours, or an update in progress. Retry; with an `Idempotency-Key` it is safe. */
        type: "invalid_request_error" | "idempotency_error" | "authentication_error" | "permission_error" | "receiving_frozen" | "account_past_due" | "amount_too_small" | "rate_limit_error" | "rate_unavailable" | "api_error";
        /** What went wrong, in English, for a person. */
        message: string;
        /** The parameter at fault, when there is one. */
        param?: string;
    };
}

/** Up to 50 string values of your own, returned as given: keys up to 40 characters, values up to 500, 8 KB in all as JSON (a character outside ASCII counts as 6 bytes). */
export interface Metadata {
    [key: string]: string | null;
}

/** What a price was turned into US dollars at. */
export interface ExchangeRate {
    /** US dollars for one unit of the currency. A decimal string. */
    usd: string;
    /** The day of that rate. */
    date: string | null;
    /** `ecb`: the European Central Bank’s reference rate; `coingecko`: the market’s, for a currency the ECB does not publish. */
    source: "ecb" | "coingecko";
}

/** A checkout session: one payment you wait for. */
export interface CheckoutSession {
    /** `cs_live_…` or `cs_test_…`: the prefix is the mode. */
    id: string;
    object: "checkout.session";
    /** false for a test session: never fulfil a real order on it. */
    livemode: boolean;
    /** `open` — waiting; `complete` — paid, final; `expired` — its time ran out unpaid (still watched for a late payment). An expired session with `payment_status` `held` is not unpaid: the money is there and waits for your review. */
    status: "open" | "complete" | "expired";
    /** `unpaid`; `processing` — a transfer is seen, not final yet; `partially_paid` — final but short (the rest is `amount_remaining`); `held` — held for your review (`needs_review`), not to fulfil on yet; `paid` — only ever with `status` `complete`: fulfil on it. */
    payment_status: "unpaid" | "processing" | "partially_paid" | "paid" | "held";
    /** What you asked, in the currency’s smallest unit, as you sent it. */
    amount_total: number;
    /** The price’s currency, lower case. Every `amount_…` without `_usd` is in it. */
    currency: "usd" | "eur" | "gbp" | "chf" | "pln" | "czk" | "huf" | "ron" | "dkk" | "sek" | "nok" | "isk" | "try" | "jpy" | "krw" | "cny" | "hkd" | "sgd" | "inr" | "idr" | "myr" | "php" | "thb" | "ils" | "aud" | "nzd" | "cad" | "mxn" | "brl" | "zar" | "uah" | "ars" | "clp" | "aed" | "sar" | "twd" | "vnd";
    /** null for usd; else what the price was turned into US dollars at when the session was made. */
    exchange_rate: ExchangeRate | null;
    /** Received in all coins together, in the session’s currency: each transfer at the rate quoted when it was sent, then at `exchange_rate`. Money after completion still adds to it (`checkout.session.extra_received`); a reversed transfer no longer does. A decimal string. */
    amount_received: string;
    /** The total asked, as a decimal in the session’s currency ("24.90", "1500" for yen). It does not go down as money arrives. A decimal string. */
    amount_due: string;
    /** Still to send, in the session’s currency; zero once what arrived counts as paid (within the project’s underpayment tolerance). A decimal string. */
    amount_remaining: string;
    /** `amount_due` in US dollars: what every coin is counted against. A decimal string. */
    amount_due_usd: string;
    /** `amount_received` in US dollars. A decimal string. */
    amount_received_usd: string;
    /** What you have recorded as sent back, in the currency’s smallest unit (see Refunds). */
    amount_refunded: number;
    /** The ways to pay the session was made with; empty for every one the project takes. */
    payment_methods: Array<"usdt_tron" | "usdt_ethereum" | "usdt_bsc" | "usdt_solana" | "usdt_ton" | "usdt_polygon" | "usdt_arbitrum" | "usdt_optimism" | "usdt_avalanche" | "usdc_ethereum" | "usdc_base" | "usdc_solana" | "usdc_polygon" | "usdc_arbitrum" | "usdc_optimism" | "usdc_avalanche" | "usdc_bsc" | "usdc_stellar" | "btc" | "eth" | "eth_base" | "eth_arbitrum" | "eth_optimism" | "bnb" | "sol" | "ton" | "trx" | "pol" | "avax" | "ltc" | "doge" | "bch" | "xrp" | "xlm" | "pyusd_ethereum" | "pyusd_arbitrum" | "dai_ethereum" | "dai_arbitrum" | "dai_optimism" | "dai_polygon">;
    /** What it is paid with: the coin most of the counted money came in, else the one the buyer picked last; null before any pick. */
    payment: CheckoutSessionPayment | null;
    /** The payment page to send the buyer to. */
    url: string;
    /** Where the page sends the buyer once paid, `{CHECKOUT_SESSION_ID}` replaced. */
    success_url: string | null;
    /** Where the page’s back link goes. */
    cancel_url: string | null;
    /** Your order number. */
    client_reference_id: string | null;
    /** The payment link (`plink_…`) a buyer opened it from, or null for a session your server made. */
    payment_link: string | null;
    /** The buyer’s email: yours, or the one they gave on the page. */
    customer_email: string | null;
    /** Whether the page asks the buyer for an email before where to pay. */
    customer_email_collection: "required" | "optional" | "off";
    /** The page’s language; `auto` is the buyer’s own. */
    locale: string;
    /** What is paid for, shown to the buyer. */
    description: string | null;
    /** What the buyer gets, shown under `description` on the payment page only. */
    details: string | null;
    /** The page’s light or dark; null: the project’s setting. */
    appearance: "auto" | "light" | "dark" | null;
    metadata: Metadata;
    /** The money came after the link expired. */
    paid_late: boolean;
    /** The payment is held for you to accept in the dashboard; the session then completes. */
    needs_review: boolean;
    /** Why it was held, and stays once accepted; null when never held. `late` — the money came after expiry and the project reviews late payments; `amount` — far more came than was asked: it may be somebody else's payment; `refunded` — the merchant had refunded money of it before it was paid in full; `closed` — the merchant had closed the link by hand: the order may be cancelled; `peg` — the stablecoin it came in was trading away from the dollar; `withdrawn` — money came to an address a freeze withdrew: whoever froze the account may have put that wallet there, so it may not be the merchant's money at all; `handed_over` — the link was made before its account passed to whoever proved the email: we closed it then, and the money may be the earlier holder's customer's; `reversed` — money that had counted as final left the chain, and what is left no longer pays it, or it was held already; `memo` — the money came with a memo one slip off this payment's (a digit wrong, two swapped, one missing or one too many), for exactly its amount: most likely the buyer's, but only the merchant can say so. */
    review_reason: "late" | "amount" | "refunded" | "closed" | "peg" | "withdrawn" | "handed_over" | "reversed" | "memo" | null;
    /** Every transfer seen, oldest first, and the first 20 worth less than a cent (`dust`). */
    transactions: Transaction[];
    /** How many transfers worth less than a cent came, in all: never counted. */
    dust_count: number;
    /** When it was made. Unix seconds. */
    created: number;
    /** When the link runs out. Unix seconds. */
    expires_at: number;
    /** When it completed. Unix seconds. */
    completed_at: number | null;
    /** When you closed the link (expire); whatever arrives after is held for review. Unix seconds. */
    closed_at: number | null;
}

export interface CheckoutSessionPayment {
    /** The coin on its network, as in `payment_methods`. */
    asset: "usdt_tron" | "usdt_ethereum" | "usdt_bsc" | "usdt_solana" | "usdt_ton" | "usdt_polygon" | "usdt_arbitrum" | "usdt_optimism" | "usdt_avalanche" | "usdc_ethereum" | "usdc_base" | "usdc_solana" | "usdc_polygon" | "usdc_arbitrum" | "usdc_optimism" | "usdc_avalanche" | "usdc_bsc" | "usdc_stellar" | "btc" | "eth" | "eth_base" | "eth_arbitrum" | "eth_optimism" | "bnb" | "sol" | "ton" | "trx" | "pol" | "avax" | "ltc" | "doge" | "bch" | "xrp" | "xlm" | "pyusd_ethereum" | "pyusd_arbitrum" | "dai_ethereum" | "dai_arbitrum" | "dai_optimism" | "dai_polygon";
    chain: "solana" | "tron" | "ethereum" | "bsc" | "base" | "polygon" | "arbitrum" | "optimism" | "avalanche" | "ton" | "bitcoin" | "litecoin" | "dogecoin" | "bitcoincash" | "xrp" | "stellar";
    /** Its symbol, as USDT. */
    coin: string | null;
    /** In the coin: what arrived, or what is asked while nothing has. A decimal string. */
    amount: string;
    /** The coin’s US dollar rate quoted; "1" for a stablecoin. A decimal string. */
    rate_usd: string;
    /** What arrived in it, in US dollars. A decimal string. */
    amount_usd: string;
    /** Where the buyer pays; null for an address a freeze withdrew. */
    pay_address: string | null;
    /** The memo, tag or comment the payment must carry, on networks that use one. */
    memo: string | null;
    /** Until when the quoted rate holds. Unix seconds. */
    quote_expires_at: number | null;
}

/** One transfer to the payment’s address, as the chain reports it. */
export interface Transaction {
    /** The transaction’s hash (a signature on Solana); `sim_…` for one made by the simulator. */
    signature: string;
    /** The coin on its network, as in `payment_methods`. */
    asset: string | null;
    /** What it counted for, in the session’s currency. A decimal string. */
    amount: string;
    /** The same in US dollars. A decimal string. */
    amount_usd: string;
    /** In the coin, with its own decimals. */
    amount_coin: string | null;
    /** The coin’s US dollar rate it was counted at. */
    rate_usd: string | null;
    /** `confirmed` — seen, not final yet; `finalized` — final, it counts; `reversed` — it left the chain after it had counted and no longer counts. */
    status: "confirmed" | "finalized" | "reversed";
    /** Blocks since it, as last read. */
    confirmations: number | null;
    /** Worth less than a cent: on record, in no sum. */
    dust: boolean;
    /** On Ethereum, its relatives and TRON, where the money is: `waiting` — not final yet; `held` — final, at the payment’s own address; `sending` — a withdrawal is on its way; `delivered` — in your wallet; `left` — withdrawn to the wallet the payment was quoted for, which is no longer the project’s. null on networks that pay your wallet directly. */
    delivery: "waiting" | "held" | "sending" | "delivered" | "left" | null;
    /** The address it came from. Never a refund address. */
    from: string | null;
    /** The time of its block; null while unconfirmed. Unix seconds. */
    block_time: number | null;
    /** The transaction on the network’s explorer; null for a simulated one. */
    explorer_url: string | null;
}

/** A refund the merchant sent from its own wallet and recorded. */
export interface Refund {
    id: string;
    object: "refund";
    livemode: boolean;
    /** In the smallest unit of the session’s currency. */
    amount: number;
    /** The session’s currency. */
    currency: "usd" | "eur" | "gbp" | "chf" | "pln" | "czk" | "huf" | "ron" | "dkk" | "sek" | "nok" | "isk" | "try" | "jpy" | "krw" | "cny" | "hkd" | "sgd" | "inr" | "idr" | "myr" | "php" | "thb" | "ils" | "aud" | "nzd" | "cad" | "mxn" | "brl" | "zar" | "uah" | "ars" | "clp" | "aed" | "sar" | "twd" | "vnd";
    /** The session refunded. */
    checkout_session: string;
    reason: "requested_by_customer" | "duplicate" | "fraudulent" | "overpaid" | "other" | null;
    /** The hash of the refund transfer, or any reference you keep. */
    transaction: string | null;
    note: string | null;
    metadata: Metadata;
    /** Where it was recorded. */
    source: "api" | "dashboard";
    /** `voided` once a refund recorded by mistake was voided: it no longer counts. */
    status: "succeeded" | "voided";
    /** When it was voided. Unix seconds. */
    voided_at: number | null;
    /** When it was recorded. Unix seconds. */
    created: number;
}

/** A payment link. */
export interface PaymentLink {
    id: string;
    object: "payment_link";
    livemode: boolean;
    /** The address to share. */
    url: string;
    /** The switch you turn; `status` says whether it takes payments. */
    active: boolean;
    /** `active`; `inactive` — switched off; `expired` — past `expires_at`; `completed` — `payments_paid` reached `max_payments`. */
    status: "active" | "inactive" | "expired" | "completed";
    /** In the currency’s smallest unit; with `custom_amount`, the amount suggested to the buyer, or null. */
    amount: number | null;
    currency: "usd" | "eur" | "gbp" | "chf" | "pln" | "czk" | "huf" | "ron" | "dkk" | "sek" | "nok" | "isk" | "try" | "jpy" | "krw" | "cny" | "hkd" | "sgd" | "inr" | "idr" | "myr" | "php" | "thb" | "ils" | "aud" | "nzd" | "cad" | "mxn" | "brl" | "zar" | "uah" | "ars" | "clp" | "aed" | "sar" | "twd" | "vnd";
    /** The buyer types the amount. */
    custom_amount: boolean;
    /** With `custom_amount`: the least the buyer may pay; null otherwise or for the default. */
    min_amount: number | null;
    /** With `custom_amount`: the most the buyer may pay; null otherwise or for the default. */
    max_amount: number | null;
    /** It takes no new payment once this many are paid. */
    max_payments: number | null;
    /** Its sessions that completed. */
    payments_paid: number;
    /** It takes no new payment from then on. Unix seconds. */
    expires_at: number | null;
    description: string;
    details: string | null;
    success_url: string | null;
    /** When it was made. Unix seconds. */
    created: number;
}

/** A way to pay: a coin on a network. */
export interface PaymentMethod {
    object: "payment_method";
    /** What `payment_methods` on a session takes. */
    key: "usdt_tron" | "usdt_ethereum" | "usdt_bsc" | "usdt_solana" | "usdt_ton" | "usdt_polygon" | "usdt_arbitrum" | "usdt_optimism" | "usdt_avalanche" | "usdc_ethereum" | "usdc_base" | "usdc_solana" | "usdc_polygon" | "usdc_arbitrum" | "usdc_optimism" | "usdc_avalanche" | "usdc_bsc" | "usdc_stellar" | "btc" | "eth" | "eth_base" | "eth_arbitrum" | "eth_optimism" | "bnb" | "sol" | "ton" | "trx" | "pol" | "avax" | "ltc" | "doge" | "bch" | "xrp" | "xlm" | "pyusd_ethereum" | "pyusd_arbitrum" | "dai_ethereum" | "dai_arbitrum" | "dai_optimism" | "dai_polygon";
    /** The coin’s symbol, as USDT. One coin on several networks is several methods. */
    coin: string;
    /** The coin’s name, as Tether. */
    name: string;
    /** Its network. */
    chain: "solana" | "tron" | "ethereum" | "bsc" | "base" | "polygon" | "arbitrum" | "optimism" | "avalanche" | "ton" | "bitcoin" | "litecoin" | "dogecoin" | "bitcoincash" | "xrp" | "stellar";
    /** The network’s name, as TRON. */
    chain_name: string;
    /** A dollar stablecoin, priced 1:1. */
    stable: boolean;
    /** It can be sent from an exchange account, not only from a wallet. */
    from_exchange: boolean;
    /** US cents, whatever the currency asked about: the least a session paid in it may be worth now. It follows the network’s fees, so read it again rather than keep it. null: any amount from $1. */
    minimum_amount: number | null;
    /** Test mode: no test network is watched for it, so it is paid only with Simulate payment. */
    simulated_only: boolean;
}

/** A way to pay, as a buyer’s page may see it. */
export interface PublicPaymentMethod {
    object: "payment_method";
    /** What `payment_methods` on a session takes. */
    key: "usdt_tron" | "usdt_ethereum" | "usdt_bsc" | "usdt_solana" | "usdt_ton" | "usdt_polygon" | "usdt_arbitrum" | "usdt_optimism" | "usdt_avalanche" | "usdc_ethereum" | "usdc_base" | "usdc_solana" | "usdc_polygon" | "usdc_arbitrum" | "usdc_optimism" | "usdc_avalanche" | "usdc_bsc" | "usdc_stellar" | "btc" | "eth" | "eth_base" | "eth_arbitrum" | "eth_optimism" | "bnb" | "sol" | "ton" | "trx" | "pol" | "avax" | "ltc" | "doge" | "bch" | "xrp" | "xlm" | "pyusd_ethereum" | "pyusd_arbitrum" | "dai_ethereum" | "dai_arbitrum" | "dai_optimism" | "dai_polygon";
    /** The coin’s symbol, as USDT. One coin on several networks is several methods. */
    coin: string;
    /** The coin’s name, as Tether. */
    name: string;
    /** Its network. */
    chain: "solana" | "tron" | "ethereum" | "bsc" | "base" | "polygon" | "arbitrum" | "optimism" | "avalanche" | "ton" | "bitcoin" | "litecoin" | "dogecoin" | "bitcoincash" | "xrp" | "stellar";
    /** The network’s name, as TRON. */
    chain_name: string;
    /** A dollar stablecoin, priced 1:1. */
    stable: boolean;
    /** It can be sent from an exchange account, not only from a wallet. */
    from_exchange: boolean;
    /** US cents, whatever the currency asked about: the least a session paid in it may be worth now. It follows the network’s fees, so read it again rather than keep it. null: any amount from $1. */
    minimum_amount: number | null;
}

export interface Currency {
    object: "currency";
    /** Its ISO code, lower case: what `currency` on a session takes. */
    code: "usd" | "eur" | "gbp" | "chf" | "pln" | "czk" | "huf" | "ron" | "dkk" | "sek" | "nok" | "isk" | "try" | "jpy" | "krw" | "cny" | "hkd" | "sgd" | "inr" | "idr" | "myr" | "php" | "thb" | "ils" | "aud" | "nzd" | "cad" | "mxn" | "brl" | "zar" | "uah" | "ars" | "clp" | "aed" | "sar" | "twd" | "vnd";
    /** Of its smallest unit, which amounts are in. */
    decimals: 2 | 0;
    /** A session in it can be made now. False while there is no current rate for it, or the ECB’s and the market’s disagree. */
    available: boolean;
    /** null for usd and while not available; else the rate a session made now would be priced at. */
    exchange_rate: ExchangeRate | null;
}

/** An event, as its webhooks carry it. */
export interface WebhookEvent {
    /** Unique: keep the ones you have handled, since an event can arrive more than once. */
    id: string;
    object: "event";
    type: "checkout.session.payment_detected" | "checkout.session.partially_paid" | "checkout.session.completed" | "checkout.session.expired" | "checkout.session.needs_review" | "checkout.session.extra_received" | "checkout.session.payment_reversed" | "refund.created" | "refund.voided";
    livemode: boolean;
    /** When it happened. Unix seconds. */
    created: number;
    data: {
        /** The checkout session as it was then; for `refund.*`, the refund. */
        object: CheckoutSession | Refund;
    };
}

/** An event, as `GET /events` shows it: the payload its webhooks carried, and how many endpoints have not taken it yet. */
export type Event = WebhookEvent & {
    /** Endpoints that have not taken it yet (their delivery is waiting or failed). */
    pending_webhooks: number;
};

export interface CheckoutSessionList {
    object: "list";
    data: CheckoutSession[];
    /** More objects follow: ask again with `starting_after` the last ID. */
    has_more: boolean;
    url: "/v1/checkout/sessions";
}

export interface RefundList {
    object: "list";
    data: Refund[];
    /** More objects follow: ask again with `starting_after` the last ID. */
    has_more: boolean;
    url: "/v1/refunds";
}

export interface PaymentLinkList {
    object: "list";
    data: PaymentLink[];
    /** More objects follow: ask again with `starting_after` the last ID. */
    has_more: boolean;
    url: "/v1/payment_links";
}

export interface EventList {
    object: "list";
    data: Event[];
    /** More objects follow: ask again with `starting_after` the last ID. */
    has_more: boolean;
    url: "/v1/events";
}

export interface PaymentMethodList {
    object: "list";
    data: PaymentMethod[];
    /** More objects follow: ask again with `starting_after` the last ID. */
    has_more: boolean;
    url: "/v1/payment_methods";
    /** The key’s mode. */
    livemode: boolean;
}

export interface PublicPaymentMethodList {
    object: "list";
    data: PublicPaymentMethod[];
    /** More objects follow: ask again with `starting_after` the last ID. */
    has_more: boolean;
    url: "/v1/public/payment_methods";
    /** The key’s mode. */
    livemode: boolean;
}

export interface CurrencyList {
    object: "list";
    data: Currency[];
    /** More objects follow: ask again with `starting_after` the last ID. */
    has_more: boolean;
    url: "/v1/currencies";
    /** The key’s mode. */
    livemode: boolean;
}

export interface CreateCheckoutSessionRequest {
    /** In the currency’s smallest unit, as Stripe takes it: cents, pence — and whole yen, won and krónur, which have none. Worth $1 to $100,000 at the day’s rate: in usd, 100 to 10000000. */
    amount: number;
    /** The price’s currency, its ISO code in lower or upper case. See `GET /currencies`. */
    currency?: "usd" | "eur" | "gbp" | "chf" | "pln" | "czk" | "huf" | "ron" | "dkk" | "sek" | "nok" | "isk" | "try" | "jpy" | "krw" | "cny" | "hkd" | "sgd" | "inr" | "idr" | "myr" | "php" | "thb" | "ils" | "aud" | "nzd" | "cad" | "mxn" | "brl" | "zar" | "uah" | "ars" | "clp" | "aed" | "sar" | "twd" | "vnd" | "USD" | "EUR" | "GBP" | "CHF" | "PLN" | "CZK" | "HUF" | "RON" | "DKK" | "SEK" | "NOK" | "ISK" | "TRY" | "JPY" | "KRW" | "CNY" | "HKD" | "SGD" | "INR" | "IDR" | "MYR" | "PHP" | "THB" | "ILS" | "AUD" | "NZD" | "CAD" | "MXN" | "BRL" | "ZAR" | "UAH" | "ARS" | "CLP" | "AED" | "SAR" | "TWD" | "VND";
    /** The ways to pay to offer, by key (see `GET /payment_methods`). Default: every one the project has a wallet for. */
    payment_methods?: Array<"usdt_tron" | "usdt_ethereum" | "usdt_bsc" | "usdt_solana" | "usdt_ton" | "usdt_polygon" | "usdt_arbitrum" | "usdt_optimism" | "usdt_avalanche" | "usdc_ethereum" | "usdc_base" | "usdc_solana" | "usdc_polygon" | "usdc_arbitrum" | "usdc_optimism" | "usdc_avalanche" | "usdc_bsc" | "usdc_stellar" | "btc" | "eth" | "eth_base" | "eth_arbitrum" | "eth_optimism" | "bnb" | "sol" | "ton" | "trx" | "pol" | "avax" | "ltc" | "doge" | "bch" | "xrp" | "xlm" | "pyusd_ethereum" | "pyusd_arbitrum" | "dai_ethereum" | "dai_arbitrum" | "dai_optimism" | "dai_polygon">;
    /** Narrows the offer to one network. */
    network?: "solana" | "tron" | "ethereum" | "bsc" | "base" | "polygon" | "arbitrum" | "optimism" | "avalanche" | "ton" | "bitcoin" | "litecoin" | "dogecoin" | "bitcoincash" | "xrp" | "stellar";
    /** Where the payment page sends the buyer once paid: only the browser that opened the page, within 60 minutes of paying. `{CHECKOUT_SESSION_ID}` in it is replaced with the session’s ID. It must carry no secret: look the order up from the session ID. */
    success_url?: string | null;
    /** Where the page’s back link goes. `{CHECKOUT_SESSION_ID}` works here too. */
    cancel_url?: string | null;
    /** Your order number. Comes back in every event. */
    client_reference_id?: string | null;
    /** The buyer’s email, if you have it: the page then does not ask for one. */
    customer_email?: string | null;
    /** Whether the payment page asks the buyer for an email before it shows where to pay: `required`, `optional` (they may skip it) or `off`. Default: the project’s setting. */
    customer_email_collection?: "required" | "optional" | "off" | null;
    /** The payment page’s language as an IETF tag, the closest of those it speaks: en, ru, uk, pl, es, es-mx, pt, pt-br, fr, de, ja, it, nl, ro, cs, zh-hans, zh-hant, ko, id, ms, vi, th, fil, hi, bn, ur, ta, te, mr, gu, kn, ml, pa, ne, si, my, km, lo, mn, kk, uz, ky, tg, az, ka, hy, ar, he, fa, tr, ps, el, hu, sv, da, nb, fi, sk, sl, hr, sr, bs, bg, mk, sq, lt, lv, et, be, ca, eu, gl, is, sw, am, ha, yo, ig, zu, xh, af, so, rw, mg, ht. `auto` (the default) is the buyer’s own; a language it lacks is the buyer’s own too, never an error. */
    locale?: string | null;
    /** What is being paid for, shown to the buyer, in lists and exports. Neither it nor `details` may name an Orboni fee, bill or invoice (422). */
    description?: string | null;
    /** What the buyer gets, shown under `description` on the payment page only. Plain text, line breaks kept. Kept to 500 characters: a longer one, up to 1000, is cut there at a word. */
    details?: string | null;
    /** `light` or `dark` draws the payment page so; `auto` is the buyer’s own. Default: the project’s setting. */
    appearance?: "auto" | "light" | "dark" | null;
    metadata?: Metadata;
    /** Seconds the link stays open. A test session stays open 7200 seconds at most: a longer one is shortened, not refused. */
    expires_in?: number | null;
}

export interface CreateRefundRequest {
    /** The session refunded. */
    checkout_session: string;
    /** In the smallest unit of the session’s currency. Default: all that is left. Never more than was received — in the session’s currency, at its `exchange_rate` — less what was refunded. */
    amount?: number | null;
    reason?: "requested_by_customer" | "duplicate" | "fraudulent" | "overpaid" | "other" | null;
    /** The hash of your refund transfer, or any reference you keep. */
    transaction?: string | null;
    note?: string | null;
    metadata?: Metadata;
}

export interface CreatePaymentLinkRequest {
    /** What is paid for: the buyer sees it on the link’s page and the payment page. */
    description: string;
    /** In the currency’s smallest unit, worth $1 to $100,000 at the day’s rate. Required unless `custom_amount`; with it, the amount suggested to the buyer. */
    amount?: number | null;
    /** The link’s currency, as on a session; its amounts are in it. */
    currency?: "usd" | "eur" | "gbp" | "chf" | "pln" | "czk" | "huf" | "ron" | "dkk" | "sek" | "nok" | "isk" | "try" | "jpy" | "krw" | "cny" | "hkd" | "sgd" | "inr" | "idr" | "myr" | "php" | "thb" | "ils" | "aud" | "nzd" | "cad" | "mxn" | "brl" | "zar" | "uah" | "ars" | "clp" | "aed" | "sar" | "twd" | "vnd" | "USD" | "EUR" | "GBP" | "CHF" | "PLN" | "CZK" | "HUF" | "RON" | "DKK" | "SEK" | "NOK" | "ISK" | "TRY" | "JPY" | "KRW" | "CNY" | "HKD" | "SGD" | "INR" | "IDR" | "MYR" | "PHP" | "THB" | "ILS" | "AUD" | "NZD" | "CAD" | "MXN" | "BRL" | "ZAR" | "UAH" | "ARS" | "CLP" | "AED" | "SAR" | "TWD" | "VND";
    /** The buyer types the amount. */
    custom_amount?: boolean;
    /** With `custom_amount`: the least the buyer may pay, in the link’s currency. Default: worth $1. */
    min_amount?: number | null;
    /** With `custom_amount`: the most the buyer may pay. Default: worth $100,000. */
    max_amount?: number | null;
    /** It takes no new payment once this many are paid. */
    max_payments?: number | null;
    /** Unix seconds: it takes no new payment from then on. In the future, up to a year ahead. */
    expires_at?: number | null;
    /** What the buyer gets, in your words. */
    details?: string | null;
    /** Where the buyer goes once paid. */
    success_url?: string | null;
}

/** Only the fields sent change. */
export interface UpdatePaymentLinkRequest {
    /** What is paid for: the buyer sees it on the link’s page and the payment page. */
    description?: string;
    /** In the currency’s smallest unit, worth $1 to $100,000 at the day’s rate. Required unless `custom_amount`; with it, the amount suggested to the buyer. */
    amount?: number | null;
    /** The link’s currency, as on a session; its amounts are in it. */
    currency?: "usd" | "eur" | "gbp" | "chf" | "pln" | "czk" | "huf" | "ron" | "dkk" | "sek" | "nok" | "isk" | "try" | "jpy" | "krw" | "cny" | "hkd" | "sgd" | "inr" | "idr" | "myr" | "php" | "thb" | "ils" | "aud" | "nzd" | "cad" | "mxn" | "brl" | "zar" | "uah" | "ars" | "clp" | "aed" | "sar" | "twd" | "vnd" | "USD" | "EUR" | "GBP" | "CHF" | "PLN" | "CZK" | "HUF" | "RON" | "DKK" | "SEK" | "NOK" | "ISK" | "TRY" | "JPY" | "KRW" | "CNY" | "HKD" | "SGD" | "INR" | "IDR" | "MYR" | "PHP" | "THB" | "ILS" | "AUD" | "NZD" | "CAD" | "MXN" | "BRL" | "ZAR" | "UAH" | "ARS" | "CLP" | "AED" | "SAR" | "TWD" | "VND";
    /** The buyer types the amount. */
    custom_amount?: boolean;
    /** With `custom_amount`: the least the buyer may pay, in the link’s currency. Default: worth $1. */
    min_amount?: number | null;
    /** With `custom_amount`: the most the buyer may pay. Default: worth $100,000. */
    max_amount?: number | null;
    /** It takes no new payment once this many are paid. */
    max_payments?: number | null;
    /** Unix seconds: it takes no new payment from then on. In the future, up to a year ahead. */
    expires_at?: number | null;
    /** What the buyer gets, in your words. */
    details?: string | null;
    /** Where the buyer goes once paid. */
    success_url?: string | null;
    /** `false` switches the link off, `true` on again. */
    active?: boolean;
}

/** Every event type a webhook can carry. */
export type EventType = "checkout.session.payment_detected" | "checkout.session.partially_paid" | "checkout.session.completed" | "checkout.session.expired" | "checkout.session.needs_review" | "checkout.session.extra_received" | "checkout.session.payment_reversed" | "refund.created" | "refund.voided";
