// The client against a local stand-in for the API: what it sends, how it
// retries, how it pages, and which error each answer becomes.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { after, before, beforeEach, describe, it } from 'node:test';
import Orboni, {
    APIError,
    AmountTooSmallError,
    AuthenticationError,
    ConnectionError,
    IdempotencyError,
    InvalidRequestError,
    OrboniError,
    RateLimitError,
} from '../dist/esm/index.js';

let server;
let base;
/** Each request the stand-in received: method, url, headers, body. */
let seen = [];
/** What it answers, in order; the last one repeats. */
let answers = [];

before(async () => {
    server = createServer((req, res) => {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
            seen.push({ method: req.method, url: req.url, headers: req.headers, body });
            const answer = answers.length > 1 ? answers.shift() : answers[0];
            if (typeof answer === 'function') {
                answer(req, res);

                return;
            }
            res.writeHead(answer.status ?? 200, { 'Content-Type': 'application/json', ...(answer.headers ?? {}) });
            res.end(typeof answer.body === 'string' ? answer.body : JSON.stringify(answer.body ?? {}));
        });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}/v1`;
});

after(() => server.close());

beforeEach(() => {
    seen = [];
    answers = [];
});

const client = (config = {}) => new Orboni('sk_test_abc123', { baseUrl: base, ...config });
const session = (id = 'cs_test_1') => ({ id, object: 'checkout.session', status: 'open' });

describe('the key', () => {
    it('is required', () => {
        assert.throws(() => new Orboni(undefined), TypeError);
        assert.throws(() => new Orboni('  '), TypeError);
    });

    it('is never a publishable one', () => {
        assert.throws(() => new Orboni('pk_test_abc'), /publishable/);
    });

    it('tells test mode', () => {
        assert.equal(new Orboni('sk_test_x').testMode, true);
        assert.equal(new Orboni('sk_live_x').testMode, false);
    });
});

describe('a request', () => {
    it('sends the key, JSON and who is asking', async () => {
        answers = [{ body: session() }];
        const created = await client().checkout.sessions.create({ amount: 2500, currency: 'usd', metadata: { order_id: '1042' } });

        assert.equal(created.id, 'cs_test_1');
        const [request] = seen;
        assert.equal(request.method, 'POST');
        assert.equal(request.url, '/v1/checkout/sessions');
        assert.equal(request.headers.authorization, 'Bearer sk_test_abc123');
        assert.equal(request.headers['content-type'], 'application/json');
        assert.match(request.headers['user-agent'], /^orboni-node\/\d+\.\d+\.\d+ node\/v\d+/);
        assert.deepEqual(JSON.parse(request.body), { amount: 2500, currency: 'usd', metadata: { order_id: '1042' } });
    });

    it('gives every POST an idempotency key, the caller’s when given', async () => {
        answers = [{ body: session() }];
        await client().checkout.sessions.create({ amount: 100 });
        await client().checkout.sessions.create({ amount: 100 }, { idempotencyKey: 'order_1042' });

        assert.match(seen[0].headers['idempotency-key'], /^orboni-node-[0-9a-f-]{36}$/);
        assert.equal(seen[1].headers['idempotency-key'], 'order_1042');
    });

    it('sends no idempotency key or body with a GET, and its query in brackets', async () => {
        answers = [{ body: { object: 'list', data: [], has_more: false, url: '/v1/checkout/sessions' } }];
        await client().checkout.sessions.list({ limit: 3, status: 'open', created: { gte: 1767225600, lt: 1767312000 }, customer_email: 'a+b@example.com', ending_before: undefined });

        const [request] = seen;
        assert.equal(request.method, 'GET');
        assert.equal(request.headers['idempotency-key'], undefined);
        assert.equal(request.body, '');
        assert.equal(
            request.url,
            '/v1/checkout/sessions?limit=3&status=open&created%5Bgte%5D=1767225600&created%5Blt%5D=1767312000&customer_email=a%2Bb%40example.com',
        );
    });

    it('escapes an ID and refuses an empty one', async () => {
        answers = [{ body: session('a/b') }];
        await client().checkout.sessions.retrieve('a/b');
        assert.equal(seen[0].url, '/v1/checkout/sessions/a%2Fb');

        assert.throws(() => client().checkout.sessions.retrieve(''), TypeError);
        assert.throws(() => client().refunds.void('  '), TypeError);
    });

    it('reaches each operation at its path', async () => {
        answers = [{ body: { id: 'x', object: 'list', data: [], has_more: false } }];
        const orboni = client();
        await orboni.checkout.sessions.expire('cs_test_1');
        await orboni.paymentLinks.create({ amount: 500 });
        await orboni.paymentLinks.update('plink_1', { active: false });
        await orboni.paymentLinks.retrieve('plink_1');
        await orboni.paymentLinks.list({ active: true });
        await orboni.refunds.create({ checkout_session: 'cs_test_1' });
        await orboni.refunds.retrieve('re_1');
        await orboni.refunds.list({ checkout_session: 'cs_test_1' });
        await orboni.refunds.void('re_1');
        await orboni.events.retrieve('evt_1');
        await orboni.events.list({ type: 'checkout.session.completed' });
        await orboni.events.resend('evt_1');
        await orboni.paymentMethods.list({ amount: 2500, currency: 'eur' });
        await orboni.currencies.list();

        assert.deepEqual(
            seen.map((r) => `${r.method} ${r.url}`),
            [
                'POST /v1/checkout/sessions/cs_test_1/expire',
                'POST /v1/payment_links',
                'POST /v1/payment_links/plink_1',
                'GET /v1/payment_links/plink_1',
                'GET /v1/payment_links?active=true',
                'POST /v1/refunds',
                'GET /v1/refunds/re_1',
                'GET /v1/refunds?checkout_session=cs_test_1',
                'POST /v1/refunds/re_1/void',
                'GET /v1/events/evt_1',
                'GET /v1/events?type=checkout.session.completed',
                'POST /v1/events/evt_1/resend',
                'GET /v1/payment_methods?amount=2500&currency=eur',
                'GET /v1/currencies',
            ],
        );
        assert.equal(seen[0].body, '', 'expire sends no body');
    });

    it('works through CommonJS too', () => {
        const require = createRequire(import.meta.url);
        const cjs = require('../dist/cjs/index.js');
        assert.equal(typeof cjs.Orboni, 'function');
        assert.equal(cjs.default, cjs.Orboni);
        assert.ok(new cjs.Orboni('sk_test_x').checkout.sessions);
    });
});

describe('an error', () => {
    const cases = [
        [400, 'invalid_request_error', InvalidRequestError],
        [404, 'invalid_request_error', InvalidRequestError],
        [400, 'idempotency_error', IdempotencyError],
        [401, 'authentication_error', AuthenticationError],
        [422, 'amount_too_small', AmountTooSmallError],
    ];
    for (const [status, type, Class] of cases) {
        it(`${status} ${type} is a ${Class.name}`, async () => {
            answers = [{ status, body: { error: { type, message: 'No.', param: 'amount' } } }];
            const error = await client().checkout.sessions.create({ amount: 1 }).catch((e) => e);

            assert.ok(error instanceof Class);
            assert.ok(error instanceof OrboniError);
            assert.equal(error.type, type);
            assert.equal(error.message, 'No.');
            assert.equal(error.param, 'amount');
            assert.equal(error.statusCode, status);
            assert.equal(seen.length, 1, 'not retried');
        });
    }

    it('of a type the library does not know is still an OrboniError', async () => {
        answers = [{ status: 403, body: { error: { type: 'something_new', message: 'New.' } } }];
        const error = await client().currencies.list().catch((e) => e);
        assert.equal(error.constructor, OrboniError);
        assert.equal(error.type, 'something_new');
    });

    it('a success that is not JSON is an APIError', async () => {
        answers = [{ status: 200, body: 'not json' }];
        const error = await client().currencies.list().catch((e) => e);
        assert.ok(error instanceof APIError);
        assert.equal(error.type, 'api_error');
    });

    it('a redirect is not followed, so the key stays with Orboni', async () => {
        answers = [{ status: 302, headers: { Location: 'http://127.0.0.1:1/elsewhere' }, body: '' }];
        const error = await client().currencies.list().catch((e) => e);
        assert.ok(error instanceof InvalidRequestError);
        assert.equal(error.statusCode, 302);
        assert.equal(seen.length, 1);
    });

    it('without a JSON body still says the status', async () => {
        answers = [{ status: 502, body: '<html>Bad gateway</html>' }];
        const error = await client({ maxRetries: 0 }).currencies.list().catch((e) => e);
        assert.ok(error instanceof APIError);
        assert.equal(error.statusCode, 502);
    });
});

describe('retries', () => {
    it('try again after a 5xx, with the same idempotency key', async () => {
        answers = [{ status: 503, body: { error: { type: 'api_error', message: 'Busy.' } } }, { body: session() }];
        const created = await client().checkout.sessions.create({ amount: 100 });

        assert.equal(created.id, 'cs_test_1');
        assert.equal(seen.length, 2);
        assert.equal(seen[0].headers['idempotency-key'], seen[1].headers['idempotency-key']);
    });

    it('try again after a 409 (the first request still running)', async () => {
        answers = [{ status: 409, body: { error: { type: 'idempotency_error', message: 'Running.' } } }, { body: session() }];
        await client().checkout.sessions.create({ amount: 100 }, { idempotencyKey: 'k' });
        assert.equal(seen.length, 2);
    });

    it('wait Retry-After on a 429', async () => {
        answers = [{ status: 429, headers: { 'Retry-After': '1' }, body: { error: { type: 'rate_limit_error', message: 'Slow down.' } } }, { body: session() }];
        const started = Date.now();
        await client().checkout.sessions.retrieve('cs_test_1');
        assert.ok(Date.now() - started >= 950);
        assert.equal(seen.length, 2);
    });

    it('do not wait out a long Retry-After', async () => {
        answers = [{ status: 429, headers: { 'Retry-After': '120' }, body: { error: { type: 'rate_limit_error', message: 'Slow down.' } } }];
        const error = await client().checkout.sessions.retrieve('cs_test_1').catch((e) => e);
        assert.ok(error instanceof RateLimitError);
        assert.equal(error.retryAfter, 120);
        assert.equal(seen.length, 1);
    });

    it('stop after maxRetries', async () => {
        answers = [{ status: 500, body: { error: { type: 'api_error', message: 'Ours.' } } }];
        const error = await client({ maxRetries: 1 }).currencies.list().catch((e) => e);
        assert.ok(error instanceof APIError);
        assert.equal(seen.length, 2);
    });

    it('try again when the connection drops, then say so', async () => {
        answers = [(req, res) => res.socket.destroy()];
        const error = await client({ maxRetries: 2 }).currencies.list().catch((e) => e);
        assert.ok(error instanceof ConnectionError);
        assert.equal(error.type, 'connection_error');
        assert.equal(seen.length, 3);
    });

    it('end a call that takes too long', async () => {
        answers = [(req, res) => setTimeout(() => res.end('{}'), 500)];
        const error = await client({ timeout: 100, maxRetries: 0 }).currencies.list().catch((e) => e);
        assert.ok(error instanceof ConnectionError);
        assert.match(error.message, /100 ms/);
    });

    it('stop at once when the caller aborts', async () => {
        answers = [(req, res) => setTimeout(() => res.end('{}'), 500)];
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 50);
        const error = await client().currencies.list({ signal: controller.signal }).catch((e) => e);
        assert.ok(!(error instanceof OrboniError));
        assert.equal(seen.length, 1);
    });
});

describe('a list', () => {
    const page = (ids, hasMore) => ({ body: { object: 'list', data: ids.map((id) => ({ id })), has_more: hasMore, url: '/v1/refunds' } });

    it('awaited is one page', async () => {
        answers = [page(['re_3', 're_2'], true)];
        const list = await client().refunds.list({ limit: 2 });
        assert.deepEqual(list.data.map((r) => r.id), ['re_3', 're_2']);
        assert.equal(list.has_more, true);
        assert.equal(seen.length, 1);
    });

    it('iterated is every object, asked page by page', async () => {
        answers = [page(['re_5', 're_4'], true), page(['re_3', 're_2'], true), page(['re_1'], false)];
        const ids = [];
        for await (const refund of client().refunds.list({ limit: 2, checkout_session: 'cs_test_1' })) {
            ids.push(refund.id);
        }
        assert.deepEqual(ids, ['re_5', 're_4', 're_3', 're_2', 're_1']);
        assert.deepEqual(
            seen.map((r) => r.url),
            ['/v1/refunds?limit=2&checkout_session=cs_test_1', '/v1/refunds?limit=2&checkout_session=cs_test_1&starting_after=re_4', '/v1/refunds?limit=2&checkout_session=cs_test_1&starting_after=re_2'],
        );
    });

    it('iterated from ending_before goes the other way', async () => {
        answers = [page(['re_7', 're_6'], true), page(['re_8'], false)];
        const ids = [];
        for await (const refund of client().refunds.list({ limit: 2, ending_before: 're_5' })) {
            ids.push(refund.id);
        }
        assert.deepEqual(ids, ['re_6', 're_7', 're_8']);
        assert.equal(seen[1].url, '/v1/refunds?limit=2&ending_before=re_7');
    });

    it('stops early when asked for a number', async () => {
        answers = [page(['re_5', 're_4'], true), page(['re_3', 're_2'], true)];
        const items = await client().refunds.list({ limit: 2 }).autoPagingToArray({ limit: 3 });
        assert.deepEqual(items.map((r) => r.id), ['re_5', 're_4', 're_3']);
        assert.equal(seen.length, 2);
    });
});
