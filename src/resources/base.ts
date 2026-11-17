import type { Orboni, RequestOptions } from '../client.js';

/** The part of a resource every one shares: its client and a checked path. */
export abstract class Resource {
    constructor(protected readonly client: Orboni) {}

    /** `/refunds/re_…`: the ID checked and escaped, so an empty one never reaches the list. */
    protected path(base: string, id: string, action = ''): string {
        if (typeof id !== 'string' || id.trim() === '') {
            throw new TypeError(`An ID is needed for ${base}/{id}${action}.`);
        }

        return `${base}/${encodeURIComponent(id)}${action}`;
    }
}

export type { RequestOptions };
