/**
 * Every failure is an OrboniError. A request Orboni refused carries the
 * API's own `type` (branch on it, or on the subclass, never on `message`),
 * the `param` at fault when there is one, and the HTTP status.
 */
export class OrboniError extends Error {
    /** The API's error type, e.g. `invalid_request_error`; `connection_error` or `signature_verification_error` for the library's own. */
    readonly type: string;
    /** The parameter at fault, when there is one. */
    readonly param: string | undefined;
    /** The HTTP status; undefined when no answer came. */
    readonly statusCode: number | undefined;
    /** The answer's headers, lower-cased. */
    readonly headers: Record<string, string>;
    /** The error object as the API sent it. */
    readonly raw: unknown;

    constructor(
        message: string,
        init: {
            type: string;
            param?: string | undefined;
            statusCode?: number | undefined;
            headers?: Record<string, string>;
            raw?: unknown;
            cause?: unknown;
        },
    ) {
        super(message, init.cause === undefined ? undefined : { cause: init.cause });
        this.name = new.target.name;
        this.type = init.type;
        this.param = init.param;
        this.statusCode = init.statusCode;
        this.headers = init.headers ?? {};
        this.raw = init.raw;
    }
}

/** 400, 404, 413, 422: a bad parameter (`param` names it), no such object, or a body too large. */
export class InvalidRequestError extends OrboniError {}

/** 400: an Idempotency-Key reused with other parameters; 409: its first request is still running. */
export class IdempotencyError extends OrboniError {}

/** 401: no key, a wrong one or a revoked one. */
export class AuthenticationError extends OrboniError {}

/** 403: a suspended or closed account, or a live key before the account's email is confirmed. */
export class PermissionError extends OrboniError {}

/** 403: the owner froze receiving; live keys only read until it is unfrozen. */
export class ReceivingFrozenError extends OrboniError {}

/** 402: live only, an Orboni invoice is past due. */
export class AccountPastDueError extends OrboniError {}

/** 422: under the minimum of every network the session could be paid on. */
export class AmountTooSmallError extends OrboniError {}

/** 429: too many requests or open sessions. `retryAfter` says how long to wait. */
export class RateLimitError extends OrboniError {
    /** Seconds to wait, from the Retry-After header. */
    get retryAfter(): number | undefined {
        const value = Number(this.headers['retry-after']);

        return Number.isFinite(value) ? value : undefined;
    }
}

/** 503: no current exchange rate for the price's currency. Try again shortly. */
export class RateUnavailableError extends OrboniError {}

/** 500, 503: Orboni's side, or an update in progress. Safe to retry with the same idempotency key. */
export class APIError extends OrboniError {}

/** No answer: the network failed or the request timed out. */
export class ConnectionError extends OrboniError {}

/** A webhook whose signature, timestamp or body could not be verified. Answer it with 400. */
export class SignatureVerificationError extends OrboniError {}

const BY_TYPE: Record<string, typeof OrboniError> = {
    invalid_request_error: InvalidRequestError,
    idempotency_error: IdempotencyError,
    authentication_error: AuthenticationError,
    permission_error: PermissionError,
    receiving_frozen: ReceivingFrozenError,
    account_past_due: AccountPastDueError,
    amount_too_small: AmountTooSmallError,
    rate_limit_error: RateLimitError,
    rate_unavailable: RateUnavailableError,
    api_error: APIError,
};

/** The error for an answer that is not a success. */
export function errorFromResponse(statusCode: number, headers: Record<string, string>, body: unknown): OrboniError {
    const error =
        body !== null && typeof body === 'object' && 'error' in body && typeof body.error === 'object' && body.error !== null
            ? (body.error as { type?: unknown; message?: unknown; param?: unknown })
            : undefined;
    const type =
        typeof error?.type === 'string' ? error.type : statusCode >= 500 ? 'api_error' : statusCode === 401 ? 'authentication_error' : 'invalid_request_error';
    const message = typeof error?.message === 'string' ? error.message : `Orboni answered HTTP ${statusCode}.`;
    const Class = BY_TYPE[type] ?? OrboniError;

    return new Class(message, {
        type,
        param: typeof error?.param === 'string' ? error.param : undefined,
        statusCode,
        headers,
        raw: error ?? body,
    });
}
