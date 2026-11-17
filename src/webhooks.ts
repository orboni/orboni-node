import { SignatureVerificationError } from './errors.js';
import type { WebhookEvent } from './types.js';

export interface VerifyOptions {
    /** How far the signature's time may be from now, in seconds. Default 300. */
    tolerance?: number;
    /** Now, in Unix seconds: for tests only. */
    now?: number;
}

const DEFAULT_TOLERANCE = 300;
const encoder = new TextEncoder();

/**
 * Orboni signs every webhook: `Webhook-Signature: t=<unix seconds>,v1=<hex
 * HMAC-SHA256 of "<t>.<raw body>" with your endpoint's signing secret>`, one
 * `v1` per secret while a rolled secret still signs. Uses Web Crypto, so it
 * runs in Node.js, Deno, Bun and edge runtimes alike.
 *
 *     const event = await orboni.webhooks.constructEvent(rawBody, req.headers['webhook-signature'], secret);
 */
export class Webhooks {
    /** The header Orboni signs with. */
    static readonly HEADER = 'Webhook-Signature';

    /**
     * The event, once its signature is checked: throws SignatureVerificationError
     * otherwise. `payload` is the request's body exactly as it arrived (a string
     * or bytes), never JSON your framework parsed and wrote again.
     */
    async constructEvent(
        payload: string | Uint8Array | ArrayBuffer,
        header: string | string[] | null | undefined,
        secret: string | string[],
        options: VerifyOptions = {},
    ): Promise<WebhookEvent> {
        const body = text(payload);
        await this.verifySignature(body, header, secret, options);
        try {
            return JSON.parse(body) as WebhookEvent;
        } catch (error) {
            throw new SignatureVerificationError('The webhook is signed but its body is not JSON.', {
                type: 'signature_verification_error',
                cause: error,
            });
        }
    }

    /** Checks the signature only; throws SignatureVerificationError when it does not hold. */
    async verifySignature(
        payload: string | Uint8Array | ArrayBuffer,
        header: string | string[] | null | undefined,
        secret: string | string[],
        options: VerifyOptions = {},
    ): Promise<void> {
        const body = text(payload);
        const value = Array.isArray(header) ? header[0] : header;
        if (typeof value !== 'string' || value.trim() === '') {
            throw fail(`No ${Webhooks.HEADER} header: this request did not come from Orboni.`);
        }

        let timestamp = NaN;
        const signatures: string[] = [];
        for (const pair of value.split(',')) {
            const at = pair.indexOf('=');
            const key = (at === -1 ? pair : pair.slice(0, at)).trim();
            const part = at === -1 ? '' : pair.slice(at + 1).trim();
            if (key === 't') {
                timestamp = Number.isNaN(timestamp) && /^\d+$/.test(part) ? Number(part) : timestamp;
            } else if (key === 'v1') {
                signatures.push(part);
            }
        }
        if (!Number.isFinite(timestamp) || timestamp <= 0 || signatures.length === 0) {
            throw fail(`The ${Webhooks.HEADER} header is not t=…,v1=….`);
        }

        const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
        if (!(typeof tolerance === 'number' && tolerance > 0)) {
            throw new TypeError('The tolerance is a number of seconds above 0.');
        }
        const now = options.now ?? Math.floor(Date.now() / 1000);
        if (Math.abs(now - timestamp) > tolerance) {
            throw fail(`The signature is ${Math.abs(now - timestamp)} s from now, more than the ${tolerance} s allowed: an old webhook replayed, or this server's clock is wrong.`);
        }

        const secrets = (Array.isArray(secret) ? secret : [secret]).filter((s) => typeof s === 'string' && s !== '');
        if (secrets.length === 0) {
            throw new TypeError("A webhook needs your endpoint's signing secret (whsec_…) to be verified.");
        }
        for (const key of secrets) {
            const expected = await hmac(key, `${timestamp}.${body}`);
            if (signatures.some((candidate) => equal(expected, candidate))) {
                return;
            }
        }

        throw fail('No signature matches: check that the signing secret is this endpoint’s, of this mode (test or live), and that the body was not changed.');
    }
}

function text(payload: string | Uint8Array | ArrayBuffer): string {
    if (typeof payload === 'string') {
        return payload;
    }
    if (payload instanceof Uint8Array || payload instanceof ArrayBuffer) {
        return new TextDecoder().decode(payload);
    }
    throw fail('Pass the raw request body (a string or a Buffer), not parsed JSON: the signature is over the bytes as sent.');
}

async function hmac(secret: string, message: string): Promise<string> {
    const key = await globalThis.crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(message)));

    return Array.from(signature, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Compares two hex strings in time that does not depend on where they differ. */
function equal(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return diff === 0;
}

function fail(message: string): SignatureVerificationError {
    return new SignatureVerificationError(message, { type: 'signature_verification_error' });
}
