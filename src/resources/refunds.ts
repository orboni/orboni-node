import type { ListPromise, ListParams } from '../list.js';
import type { CreateRefundRequest, Refund } from '../types.js';
import { Resource, type RequestOptions } from './base.js';

export type RefundCreateParams = CreateRefundRequest;

export interface RefundListParams extends ListParams {
    /** Only the refunds of this session. */
    checkout_session?: string;
}

/**
 * `/v1/refunds`: a record of money you sent back from your own wallet.
 * Orboni holds no money, so recording a refund sends nothing.
 */
export class Refunds extends Resource {
    create(params: RefundCreateParams, options?: RequestOptions): Promise<Refund> {
        return this.client.request('POST', '/refunds', params, options);
    }

    retrieve(id: string, options?: RequestOptions): Promise<Refund> {
        return this.client.request('GET', this.path('/refunds', id), undefined, options);
    }

    list(params?: RefundListParams, options?: RequestOptions): ListPromise<Refund> {
        return this.client.list('/refunds', params, options);
    }

    /** Takes back a refund recorded by mistake. */
    void(id: string, options?: RequestOptions): Promise<Refund> {
        return this.client.request('POST', this.path('/refunds', id, '/void'), undefined, options);
    }
}
