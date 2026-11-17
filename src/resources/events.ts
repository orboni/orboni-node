import type { ListPromise, ListParams } from '../list.js';
import type { Event, EventType } from '../types.js';
import { Resource, type RequestOptions } from './base.js';

export interface EventListParams extends ListParams {
    type?: EventType;
    /** Only the events of this session. */
    checkout_session?: string;
}

/** `/v1/events`: what your webhooks were sent, kept so you can read them again. */
export class Events extends Resource {
    retrieve(id: string, options?: RequestOptions): Promise<Event> {
        return this.client.request('GET', this.path('/events', id), undefined, options);
    }

    list(params?: EventListParams, options?: RequestOptions): ListPromise<Event> {
        return this.client.list('/events', params, options);
    }

    /** Sends the event to your endpoints again. */
    resend(id: string, options?: RequestOptions): Promise<Event> {
        return this.client.request('POST', this.path('/events', id, '/resend'), undefined, options);
    }
}
