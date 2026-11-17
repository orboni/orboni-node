// Webhook signatures, against cases made by Orboni's own server
// (fixtures/webhooks.json): what the server signs, the library accepts,
// and nothing else.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import Orboni, { SignatureVerificationError, Webhooks } from '../dist/esm/index.js';

const vectors = JSON.parse(readFileSync(new URL('./fixtures/webhooks.json', import.meta.url), 'utf8'));
const webhooks = new Webhooks();

describe('a signature made by Orboni', () => {
    for (const c of vectors.cases) {
        it(`${c.name}: ${c.valid ? 'accepted' : 'refused'}`, async () => {
            const result = webhooks.constructEvent(c.body, c.header, c.secret, { tolerance: vectors.tolerance, now: c.now });
            if (c.valid) {
                const event = await result;
                assert.equal(event.object, 'event');
            } else {
                await assert.rejects(result, SignatureVerificationError);
            }
        });
    }

    it('is accepted from bytes as well as text', async () => {
        const c = vectors.cases.find((v) => v.name === 'unicode body');
        const event = await webhooks.constructEvent(Buffer.from(c.body, 'utf8'), c.header, c.secret, { now: c.now });
        assert.match(event.data.object.note, /złoty/);
    });

    it('is accepted with any of several secrets', async () => {
        const c = vectors.cases.find((v) => v.name === 'valid');
        await webhooks.verifySignature(c.body, c.header, ['whsec_other', c.secret], { now: c.now });
    });

    it('takes the first of a repeated header', async () => {
        const c = vectors.cases.find((v) => v.name === 'valid');
        await webhooks.verifySignature(c.body, [c.header, 'junk'], c.secret, { now: c.now });
    });

    it('is checked by the client’s own webhooks too, with no key needed for it', async () => {
        const c = vectors.cases.find((v) => v.name === 'valid');
        const event = await new Orboni('sk_test_x').webhooks.constructEvent(c.body, c.header, c.secret, { now: c.now });
        assert.equal(event.type, 'checkout.session.completed');
    });
});

describe('a webhook', () => {
    const c = vectors.cases.find((v) => v.name === 'valid');

    it('without the header is refused', async () => {
        await assert.rejects(webhooks.constructEvent(c.body, undefined, c.secret, { now: c.now }), /No Webhook-Signature header/);
    });

    it('as parsed JSON is refused with a word on why', async () => {
        await assert.rejects(webhooks.constructEvent(JSON.parse(c.body), c.header, c.secret, { now: c.now }), /raw request body/);
    });

    it('needs a secret and a real tolerance', async () => {
        await assert.rejects(webhooks.constructEvent(c.body, c.header, '', { now: c.now }), TypeError);
        await assert.rejects(webhooks.constructEvent(c.body, c.header, c.secret, { now: c.now, tolerance: 0 }), TypeError);
    });

    it('signed now is accepted at the default tolerance', async () => {
        const { createHmac } = await import('node:crypto');
        const t = Math.floor(Date.now() / 1000);
        const header = `t=${t},v1=${createHmac('sha256', c.secret).update(`${t}.${c.body}`).digest('hex')}`;
        const event = await webhooks.constructEvent(c.body, header, c.secret);
        assert.equal(event.id, 'evt_3Fh8Kq2Lm9Np4Rs7Tv1Wx6Yz');
    });
});
