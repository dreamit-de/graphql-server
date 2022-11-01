import { IncomingHttpHeaders } from 'node:http'

/**
 * Interface for incoming server requests.
 * Used in "handleRequest" and "handleRequestAndSendResponse" core functions. Server requests from
 * different server framework may already provide these field, if not they can easily be mapped.
 */
export interface GraphQLServerRequest {
    headers: IncomingHttpHeaders,
    url?: string,
    body?: unknown,
    method?: string;
}
