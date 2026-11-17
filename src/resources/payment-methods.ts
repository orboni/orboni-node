import type { List } from '../list.js';
import type { PaymentMethod } from '../types.js';
import { Resource, type RequestOptions } from './base.js';

export interface PaymentMethodListParams {
    /** What a session would ask, in `currency`'s smallest unit: leaves out the methods whose minimum is above it. */
    amount?: number;
    currency?: string;
}

/** `/v1/payment_methods`: the coins and networks your project can be paid in now. */
export class PaymentMethods extends Resource {
    list(params?: PaymentMethodListParams, options?: RequestOptions): Promise<List<PaymentMethod>> {
        return this.client.request('GET', '/payment_methods', params, options);
    }
}
