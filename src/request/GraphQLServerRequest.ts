import { IncomingHttpHeaders } from 'node:http'

export interface GraphQLServerRequest {
    headers: IncomingHttpHeaders,
    url?: string,
    body?: unknown,
    method?: string;
}
