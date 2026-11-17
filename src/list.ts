/** One page of a list, as the API answers it. */
export interface List<T> {
    object: 'list';
    data: T[];
    /** More objects follow: ask again with `starting_after` the last ID (the library's iteration does it for you). */
    has_more: boolean;
    url: string;
    livemode?: boolean;
}

/** A Unix-seconds range for `created`: `{ gte: 1767225600 }`, or one second exactly as a number. */
export type RangeQuery = number | { gt?: number; gte?: number; lt?: number; lte?: number };

/** What every paged list takes. */
export interface ListParams {
    /** How many objects a page holds: 1 to 100, 10 by default. */
    limit?: number;
    /** The last ID of the page you have: the next, older page. */
    starting_after?: string;
    /** The first ID of the page you have: the page before it. */
    ending_before?: string;
    /** When the object was made, in Unix seconds. */
    created?: RangeQuery;
}

/**
 * A list call: await it for one page, or iterate it with `for await` for
 * every object across the pages.
 *
 *     const page = await orboni.refunds.list({ limit: 10 });
 *     for await (const refund of orboni.refunds.list({ limit: 100 })) { … }
 */
export class ListPromise<T extends { id?: string }> implements PromiseLike<List<T>>, AsyncIterable<T> {
    private first: Promise<List<T>> | undefined;

    constructor(
        private readonly fetchPage: (params: Record<string, unknown>) => Promise<List<T>>,
        private readonly params: Record<string, unknown>,
    ) {}

    private page(): Promise<List<T>> {
        this.first ??= this.fetchPage(this.params);

        return this.first;
    }

    then<A = List<T>, B = never>(
        onFulfilled?: ((value: List<T>) => A | PromiseLike<A>) | null,
        onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
    ): Promise<A | B> {
        return this.page().then(onFulfilled, onRejected);
    }

    catch<B = never>(onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null): Promise<List<T> | B> {
        return this.page().catch(onRejected);
    }

    finally(onFinally?: (() => void) | null): Promise<List<T>> {
        return this.page().finally(onFinally);
    }

    /** Every object, page after page; backwards from `ending_before` when the list was asked with it. */
    async *[Symbol.asyncIterator](): AsyncIterator<T> {
        const backwards = typeof this.params.ending_before === 'string';
        let page = await this.page();
        for (;;) {
            yield* backwards ? [...page.data].reverse() : page.data;
            const edge = backwards ? page.data[0] : page.data[page.data.length - 1];
            if (!page.has_more || typeof edge?.id !== 'string') {
                return;
            }
            const params = { ...this.params };
            delete params.starting_after;
            delete params.ending_before;
            params[backwards ? 'ending_before' : 'starting_after'] = edge.id;
            page = await this.fetchPage(params);
        }
    }

    /** Up to `limit` objects across the pages, in one array. */
    async autoPagingToArray({ limit }: { limit: number }): Promise<T[]> {
        if (!Number.isInteger(limit) || limit < 1 || limit > 10_000) {
            throw new TypeError('autoPagingToArray needs a limit between 1 and 10000.');
        }
        const items: T[] = [];
        for await (const item of this) {
            items.push(item);
            if (items.length >= limit) {
                break;
            }
        }

        return items;
    }
}
