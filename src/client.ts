import { APIError, ConnectionError, OrboniError, errorFromResponse } from './errors.js';
import { ListPromise, type List } from './list.js';
import { CheckoutSessions } from './resources/checkout-sessions.js';
import { Currencies } from './resources/currencies.js';
import { Events } from './resources/events.js';
import { PaymentLinks } from './resources/payment-links.js';
import { PaymentMethods } from './resources/payment-methods.js';
import { Refunds } from './resources/refunds.js';
import { Webhooks } from './webhooks.js';

export const VERSION = '1.0.0';

export interface OrboniConfig {
    /** The API's address. Default `https://orboni.com/v1`. */
    baseUrl?: string;
    /** How long one try may take, in milliseconds. Default 30 000. */
    timeout?: number;
    /** Tries after the first for a network failure, a 409, 429 or 5xx. Default 2. */
    maxRetries?: number;
    /** A fetch to use instead of the global one. */
    fetch?: typeof fetch;
}

/** Per call. */
export interface RequestOptions {
    /**
     * Makes a POST safe to retry: your order ID is a good one. Without it the
     * library makes one per call, so its own retries never create twice.
     */
    idempotencyKey?: string;
    /** This call's timeout, in milliseconds. */
    timeout?: number;
    /** This call's retries. */
    maxRetries?: number;
    /** Cancels the call. */
    signal?: AbortSignal;
}

type Method = 'GET' | 'POST';

/** A delay longer than this in Retry-After is not waited out: the error is thrown. */
const MAX_RETRY_AFTER_SECONDS = 20;

/**
 * Orboni's API. One instance per secret key; it keeps no state between calls.
 *
 *     import Orboni from 'orboni';
 *     const orboni = new Orboni(process.env.ORBONI_SECRET_KEY);
 *     const session = await orboni.checkout.sessions.create({ amount: 2500, currency: 'usd' });
 */
export class Orboni {
    readonly checkout: { sessions: CheckoutSessions };
    readonly paymentLinks: PaymentLinks;
    readonly refunds: Refunds;
    readonly events: Events;
    readonly paymentMethods: PaymentMethods;
    readonly currencies: Currencies;
    /** Verifies the webhooks Orboni sends; needs no key. */
    readonly webhooks: Webhooks;

    private readonly apiKey: string;
    private readonly baseUrl: string;
    private readonly timeout: number;
    private readonly maxRetries: number;
    private readonly fetchImpl: typeof fetch;

    constructor(apiKey: string | undefined, config: OrboniConfig = {}) {
        if (typeof apiKey !== 'string' || apiKey.trim() === '') {
            throw new TypeError('Orboni needs your secret key (sk_test_… or sk_live_…), from Developers → API keys in the dashboard.');
        }
        if (apiKey.startsWith('pk_')) {
            throw new TypeError('That is a publishable key, made for the browser. The API takes your secret key (sk_test_… or sk_live_…).');
        }
        this.apiKey = apiKey.trim();
        this.baseUrl = (config.baseUrl ?? 'https://orboni.com/v1').replace(/\/+$/, '');
        this.timeout = config.timeout ?? 30_000;
        this.maxRetries = config.maxRetries ?? 2;
        const impl = config.fetch ?? globalThis.fetch;
        if (typeof impl !== 'function') {
            throw new TypeError('No fetch: use Node.js 20 or later, or pass one as config.fetch.');
        }
        this.fetchImpl = impl;

        this.checkout = { sessions: new CheckoutSessions(this) };
        this.paymentLinks = new PaymentLinks(this);
        this.refunds = new Refunds(this);
        this.events = new Events(this);
        this.paymentMethods = new PaymentMethods(this);
        this.currencies = new Currencies(this);
        this.webhooks = new Webhooks();
    }

    /** True for a test key: what it makes never takes real money. */
    get testMode(): boolean {
        return this.apiKey.startsWith('sk_test_');
    }

    /** @internal */
    list<T extends { id?: string }>(path: string, params: object | undefined, options: RequestOptions | undefined): ListPromise<T> {
        return new ListPromise<T>((page) => this.request<List<T>>('GET', path, page, options), { ...(params ?? {}) });
    }

    /** @internal Any call of the API; the resources are its shortcuts. */
    async request<T>(method: Method, path: string, params?: object, options: RequestOptions = {}): Promise<T> {
        let url = this.baseUrl + path;
        let body: string | undefined;
        if (method === 'GET') {
            const query = encodeQuery(params ?? {});
            url += query === '' ? '' : `?${query}`;
        } else if (params !== undefined) {
            body = JSON.stringify(params);
        }

        const headers: Record<string, string> = {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: 'application/json',
            'User-Agent': `orboni-node/${VERSION} node/${typeof process !== 'undefined' ? process.version : 'unknown'}`,
        };
        if (body !== undefined) {
            headers['Content-Type'] = 'application/json';
        }
        if (method === 'POST') {
            headers['Idempotency-Key'] = options.idempotencyKey ?? `orboni-node-${globalThis.crypto.randomUUID()}`;
        }

        const retries = options.maxRetries ?? this.maxRetries;
        const timeout = options.timeout ?? this.timeout;
        for (let attempt = 0; ; attempt++) {
            let response: Response;
            const controller = new AbortController();
            const onAbort = () => controller.abort(options.signal?.reason);
            options.signal?.addEventListener('abort', onAbort, { once: true });
            const timer = setTimeout(() => controller.abort(new TimeoutSignal()), timeout);
            try {
                if (options.signal?.aborted) {
                    throw options.signal.reason ?? new DOMException('Aborted', 'AbortError');
                }
                // A redirect is answered as it is, an error: the key goes nowhere but baseUrl.
                response = await this.fetchImpl(url, { method, headers, body, signal: controller.signal, redirect: 'manual' });
                const text = await response.text();
                clearTimeout(timer);
                const answerHeaders = headersOf(response);
                const json = parse(text);
                if (response.ok) {
                    if (json === undefined) {
                        throw new APIError('Orboni answered with something that is not JSON.', {
                            type: 'api_error',
                            statusCode: response.status,
                            headers: answerHeaders,
                            raw: text.slice(0, 500),
                        });
                    }

                    return json as T;
                }
                const error = errorFromResponse(response.status, answerHeaders, json);
                const wait = attempt < retries ? retryDelay(response.status, answerHeaders, attempt) : undefined;
                if (wait === undefined) {
                    throw error;
                }
                await sleep(wait);
            } catch (thrown) {
                clearTimeout(timer);
                if (thrown instanceof OrboniError) {
                    throw thrown;
                }
                if (options.signal?.aborted) {
                    throw thrown;
                }
                const timedOut = controller.signal.reason instanceof TimeoutSignal;
                if (attempt >= retries) {
                    throw new ConnectionError(
                        timedOut ? `Orboni did not answer within ${timeout} ms.` : `Could not reach Orboni: ${(thrown as Error)?.message ?? thrown}`,
                        { type: 'connection_error', cause: thrown },
                    );
                }
                await sleep(backoff(attempt));
            } finally {
                options.signal?.removeEventListener('abort', onAbort);
            }
        }
    }
}

class TimeoutSignal extends Error {}

/** Milliseconds to wait before the next try, or undefined when this answer is not worth another. */
function retryDelay(status: number, headers: Record<string, string>, attempt: number): number | undefined {
    if (status !== 409 && status !== 429 && status < 500) {
        return undefined;
    }
    const after = Number(headers['retry-after']);
    if (headers['retry-after'] !== undefined && Number.isFinite(after) && after >= 0) {
        return after > MAX_RETRY_AFTER_SECONDS ? undefined : after * 1000;
    }

    return backoff(attempt);
}

/** 0.5 s, 1 s, 2 s… up to 8 s, less up to a quarter at random so clients that failed together do not retry together. */
function backoff(attempt: number): number {
    const base = Math.min(500 * 2 ** attempt, 8000);

    return base * (0.75 + Math.random() * 0.25);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function parse(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}

function headersOf(response: Response): Record<string, string> {
    const out: Record<string, string> = {};
    response.headers.forEach((value, key) => {
        out[key.toLowerCase()] = value;
    });

    return out;
}

/** `{ limit: 10, created: { gte: 1 } }` → `limit=10&created%5Bgte%5D=1`; undefined and null are left out. */
export function encodeQuery(params: object, prefix = ''): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) {
            continue;
        }
        const name = prefix === '' ? key : `${prefix}[${key}]`;
        if (typeof value === 'object' && !Array.isArray(value)) {
            const nested = encodeQuery(value, name);
            if (nested !== '') {
                parts.push(nested);
            }
        } else if (Array.isArray(value)) {
            for (const item of value) {
                parts.push(`${encodeURIComponent(`${name}[]`)}=${encodeURIComponent(String(item))}`);
            }
        } else {
            parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
        }
    }

    return parts.join('&');
}
