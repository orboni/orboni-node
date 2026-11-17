import type { ListPromise, ListParams } from '../list.js';
import type { CreatePaymentLinkRequest, PaymentLink, UpdatePaymentLinkRequest } from '../types.js';
import { Resource, type RequestOptions } from './base.js';

export type PaymentLinkCreateParams = CreatePaymentLinkRequest;
export type PaymentLinkUpdateParams = UpdatePaymentLinkRequest;

export interface PaymentLinkListParams extends ListParams {
    /** Only links that take payments (true) or that are switched off (false). */
    active?: boolean;
}

/** `/v1/payment_links`: one address that makes a session for each buyer who opens it. */
export class PaymentLinks extends Resource {
    create(params: PaymentLinkCreateParams, options?: RequestOptions): Promise<PaymentLink> {
        return this.client.request('POST', '/payment_links', params, options);
    }

    retrieve(id: string, options?: RequestOptions): Promise<PaymentLink> {
        return this.client.request('GET', this.path('/payment_links', id), undefined, options);
    }

    /** Changes the fields given; `active: false` stops it taking payments. */
    update(id: string, params: PaymentLinkUpdateParams, options?: RequestOptions): Promise<PaymentLink> {
        return this.client.request('POST', this.path('/payment_links', id), params, options);
    }

    list(params?: PaymentLinkListParams, options?: RequestOptions): ListPromise<PaymentLink> {
        return this.client.list('/payment_links', params, options);
    }
}
