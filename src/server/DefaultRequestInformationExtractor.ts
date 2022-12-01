import {
    GraphQLRequestInfo,
    GraphQLErrorWithStatusCode,
    GraphQLServerRequest,
    RequestInformationExtractor
} from '..'
import {URLSearchParams} from 'node:url'
import {GraphQLError} from 'graphql'
import contentType,
{ParsedMediaType} from 'content-type'
import getStream,
{MaxBufferError} from 'get-stream'
import zlib,
{
    Gunzip,
    Inflate
} from 'node:zlib'
import {Buffer} from 'node:buffer'

export const MAX_BUFFER_SIZE = 102_400

/**
 * Default implementation of RequestInformationExtractor interface
 */
export class DefaultRequestInformationExtractor implements RequestInformationExtractor {

    async extractInformationFromRequest(request: GraphQLServerRequest)
    : Promise<GraphQLRequestInfo> {
        const extractedURLParameters = this.extractInformationFromUrlParameters(request.url)
        const extractedBody = await this.extractInformationFromBody(request)
        return {
            query: extractedURLParameters.query ?? extractedBody.query,
            variables: extractedURLParameters.variables ?? extractedBody.variables,
            operationName: extractedURLParameters.operationName ?? extractedBody.operationName,
            error: extractedBody.error
        }
    }

    extractInformationFromUrlParameters(url: string): GraphQLRequestInfo {
        const urlParameters = new URLSearchParams(url.slice(Math.max(0, url.indexOf('?'))))
        const extractedQuery= urlParameters.get('query') ?? undefined
        const extractedVariables=
            (urlParameters.get('variables')) as Readonly<Record<string, unknown>>
            | null || undefined
        const extractedOperationName= urlParameters.get('operationName') ?? undefined
        return {
            query: extractedQuery,
            variables: extractedVariables,
            operationName: extractedOperationName,
        }
    }

    /** Extracts information from request body. Based on implementation from express-graphql */
    async extractInformationFromBody(request: GraphQLServerRequest)
    : Promise<GraphQLRequestInfo> {
        const { body } = request

        // If express has already parsed a body as a keyed object, use it.
        if (typeof body === 'object' && !(body instanceof Buffer)) {
            const bodyAsMap = body as Record<string, unknown>
            return {
                query: bodyAsMap.query as string,
                variables: bodyAsMap.variables as Readonly<Record<string, unknown>>
                    | null || undefined,
                operationName: bodyAsMap.operationName as string
            }
        }

        // Skip requests without content types.
        // eslint-disable-next-line unicorn/consistent-destructuring
        if (request.headers['content-type'] === undefined) {
            return {
                error: {
                    graphQLError: new GraphQLError('Invalid request. ' +
                        'Request header content-type is undefined.', {}),
                    statusCode: 400
                }
            }
        }

        try {
            const typeInfo = contentType.parse(request)

            /*
             * If express has already parsed a body as a string, and the content-type
             * was application/graphql, parse the string body.
             */
            if (typeof body === 'string' && typeInfo.type === 'application/graphql') {
                return { query: body }
            }

            // Already parsed body we didn't recognise? Parse nothing.
            if (body != undefined) {
                return {}
            }

            const rawBody = await this.readBody(request, typeInfo)

            if (typeof rawBody === 'string') {
                // Use the correct body parser based on Content-Type header.
                switch (typeInfo.type) {
                case 'application/graphql': {
                    return { query: rawBody }
                }
                case 'application/json': {
                    try {
                        return JSON.parse(rawBody)
                    } catch {
                        return {
                            error: {
                                graphQLError: new GraphQLError('POST body' +
                                    ' contains invalid JSON.', {}), statusCode: 400
                            }
                        }
                    }
                }
                case 'application/x-www-form-urlencoded': {
                    return this.extractInformationFromUrlParameters(`host?${rawBody}.`)
                }
                }

                // If no Content-Type header matches, parse nothing.
                return {
                    error: {
                        graphQLError: new GraphQLError(
                            `POST body contains invalid content type: ${typeInfo.type}.`, {}
                        ), statusCode: 400
                    }
                }
            } else {
                return {
                    error: rawBody
                }
            }
        } catch {
            return {
                error: {
                    graphQLError: new GraphQLError('Content type' +
                        ' could not be parsed.', {}), statusCode: 400
                }
            }
        }
    }

    // Read and parse a request body.
    async readBody(
        request: GraphQLServerRequest,
        typeInfo: ParsedMediaType,
    ): Promise<string | GraphQLErrorWithStatusCode> {
        const charset = typeInfo.parameters.charset?.toLowerCase() ?? 'utf8'

        if (!this.isCharsetSupported(charset)) {
            return {
                graphQLError: new GraphQLError(`Unsupported charset "${charset.toUpperCase()}".`,
                    {}),
                statusCode: 415
            }
        }

        const encoding = this.determineContentEncoding(request)
        const maxBuffer = MAX_BUFFER_SIZE
        const stream = this.decompressed(request, encoding)
        if ('graphQLError' in stream && 'statusCode' in stream) {
            return {
                graphQLError: stream.graphQLError,
                statusCode: stream.statusCode
            }
        }

        // Read body from stream.
        try {
            const buffer = await getStream.buffer(stream, { maxBuffer })
            return buffer.toString(this.charsetToBufferEncoding(charset))
        } catch (rawError: unknown) {
            return this.handleBufferError(rawError)
        }
    }

    // Return a decompressed stream, given an encoding.
    decompressed(
        request: GraphQLServerRequest ,
        encoding: string,
    ): GraphQLServerRequest | Inflate | Gunzip | GraphQLErrorWithStatusCode {
        switch (encoding) {
        case 'identity': {
            return request
        }
        case 'deflate': {
            return request.pipe(zlib.createInflate())
        }
        case 'gzip': {
            return request.pipe(zlib.createGunzip())
        }
        }
        return {
            graphQLError: new GraphQLError(`Unsupported content-encoding "${encoding}".`, {}),
            statusCode: 415
        }
    }

    // Assert charset encoding per JSON RFC 7159 sec 8.1
    isCharsetSupported(charset: string): boolean {
        return charset === 'utf8' || charset === 'utf8' || charset === 'utf16le'
    }

    charsetToBufferEncoding(charset: string) : BufferEncoding | undefined {
        return Buffer.isEncoding(charset) ? charset : undefined
    }

    // Determines the content encoding using the request information
    determineContentEncoding(reqest: GraphQLServerRequest): string {
        const contentEncoding = reqest.headers['content-encoding']
        return typeof contentEncoding === 'string' ? contentEncoding.toLowerCase() : 'identity'
    }

    handleBufferError(rawError: unknown): GraphQLErrorWithStatusCode {
        if (rawError instanceof MaxBufferError) {
            return {
                graphQLError: new GraphQLError('Invalid request body: request entity too large.',
                    {}),
                statusCode: 413
            }
        } else {
            const message =
                rawError instanceof Error ? rawError.message : String(rawError)
            return {
                graphQLError: new GraphQLError(`Invalid request body: ${message}.`, {}),
                statusCode: 400
            }
        }
    }
}
