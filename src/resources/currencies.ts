import type { List } from '../list.js';
import type { Currency } from '../types.js';
import { Resource, type RequestOptions } from './base.js';

/** `/v1/currencies`: the currencies a price can be in, and their decimals. */
export class Currencies extends Resource {
    list(options?: RequestOptions): Promise<List<Currency>> {
        return this.client.request('GET', '/currencies', undefined, options);
    }
}
