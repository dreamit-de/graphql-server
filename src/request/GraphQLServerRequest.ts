import { IncomingHttpHeaders } from 'node:http'

export interface GraphQLServerRequest {
    headers: IncomingHttpHeaders,
    url: string,
    body?: unknown,
    method?: string;
}

export function getRequestInfoForLogging(request?: GraphQLServerRequest): string {
    return request ? `{ url:"${request.url}", method:"${request.method}",`+
            ` headers:"${JSON.stringify(request.headers)}" }` : ''
}
