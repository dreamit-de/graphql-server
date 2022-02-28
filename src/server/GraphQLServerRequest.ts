import { IncomingHttpHeaders } from 'node:http'
import { Stream } from 'node:stream'

export interface GraphQLServerRequest {
    pipe<T extends NodeJS.WritableStream>(
        destination: T,
        options?: {
            end?: boolean | undefined;
        }
    ): T;
    headers: IncomingHttpHeaders,

    // From class Stream
    addListener: (eventName: string | symbol,
        listener: (...arguments_: unknown[]) => void) => Stream,
    on: (eventName: string | symbol, listener: (...arguments_: unknown[]) => void) => Stream,
    once: (eventName: string | symbol, listener: (...arguments_: unknown[]) => void) => Stream,
    removeListener: (eventName: string | symbol,
        listener: (...arguments_: unknown[]) => void) => Stream,
    removeAllListeners: (event?: string | symbol | undefined) => Stream,
    off: (eventName: string | symbol, listener: (...arguments_: unknown[]) => void) => Stream,
    setMaxListeners: (n: number) => Stream,
    getMaxListeners: () => number,
    // eslint-disable-next-line @typescript-eslint/ban-types
    listeners: (eventName: string | symbol) => (Function)[],
    // eslint-disable-next-line @typescript-eslint/ban-types
    rawListeners: (eventName: string | symbol) => Function[],
    emit: (eventName: string | symbol, ...arguments_: unknown[]) => boolean ,
    listenerCount: (eventName: string | symbol) => number,
    prependListener: (eventName: string | symbol,
        listener: (...arguments_: unknown[]) => void) => Stream,
    prependOnceListener: (eventName: string | symbol,
        listener: (...arguments_: unknown[]) => void) => Stream,
    eventNames: () => (string | symbol)[]
    // For GraphQLServer implementation
    url: string,
    body?: unknown,
    method?: string | undefined;
}
