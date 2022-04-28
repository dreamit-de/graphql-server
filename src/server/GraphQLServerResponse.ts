export interface GraphQLServerResponse {
    statusCode: number,
    setHeader(name: string, value: number | string | ReadonlyArray<string>): this
    end(chunk: unknown, callback?: () => void): this
    removeHeader(name: string): void;
}
