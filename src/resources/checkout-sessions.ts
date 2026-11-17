import type { ListPromise, ListParams } from '../list.js';
import type { CheckoutSession, CreateCheckoutSessionRequest } from '../types.js';
import { Resource, type RequestOptions } from './base.js';

export type CheckoutSessionCreateParams = CreateCheckoutSessionRequest;

export interface CheckoutSessionListParams extends ListParams {
    status?: CheckoutSession['status'];
    payment_status?: CheckoutSession['payment_status'];
    /** Only sessions with exactly this `client_reference_id`. */
    client_reference_id?: string;
    /** Only sessions with exactly this `customer_email`. */
    customer_email?: string;
}

/** `/v1/checkout/sessions`: one payment you wait for, and its payment page. */
export class CheckoutSessions extends Resource {
    /** Makes a session; send the buyer to its `url`. */
    create(params: CheckoutSessionCreateParams, options?: RequestOptions): Promise<CheckoutSession> {
        return this.client.request('POST', '/checkout/sessions', params, options);
    }

    /** A session as it is now: read it back before you fulfil an order. */
    retrieve(id: string, options?: RequestOptions): Promise<CheckoutSession> {
        return this.client.request('GET', this.path('/checkout/sessions', id), undefined, options);
    }

    /** Sessions, newest first. */
    list(params?: CheckoutSessionListParams, options?: RequestOptions): ListPromise<CheckoutSession> {
        return this.client.list('/checkout/sessions', params, options);
    }

    /** Closes an open session now. Money sent to it later is held for your review. */
    expire(id: string, options?: RequestOptions): Promise<CheckoutSession> {
        return this.client.request('POST', this.path('/checkout/sessions', id, '/expire'), undefined, options);
    }
}
