import {GraphQLRequestInfo,
    Request} from './GraphQLServer';
import {URLSearchParams} from 'url';
import {GraphQLError} from 'graphql';
import contentType,
{ParsedMediaType} from 'content-type';
import {GraphQLErrorWithStatusCode} from './GraphQLErrorWithStatusCode';
import getStream,
{MaxBufferError} from 'get-stream';
import zlib,
{Gunzip,
    Inflate} from 'zlib';

/**
 * Extracts information for handling GraphQL requests (query, operationName and/or variables)
 * from request url parameters or body
 */
export class GraphQLRequestInformationExtractor {

    async extractInformationFromRequest(request: Request): Promise<GraphQLRequestInfo> {
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
        const urlParameters = new URLSearchParams(url.substring(url.indexOf('?')))
        const extractedQuery= urlParameters.get('query') ?? undefined
        const extractedVariables= (urlParameters.get('variables')) as {
            readonly [name: string]: unknown;
        } | null || undefined
        const extractedOperationName= urlParameters.get('operationName') ?? undefined
        return {
            query: extractedQuery,
            variables: extractedVariables,
            operationName: extractedOperationName,
        }
    }

    /** Extracts information from request body. Based on implementation from express-graphql */
    async extractInformationFromBody(request: Request):Promise<GraphQLRequestInfo> {
        const { body } = request;

        // If express has already parsed a body as a keyed object, use it.
        if (typeof body === 'object' && !(body instanceof Buffer)) {
            const bodyAsMap = body as { [param: string]: unknown };
            return {
                query: bodyAsMap.query as string,
                variables: bodyAsMap.variables as {
                    readonly [name: string]: unknown;
                } | null || undefined,
                operationName: bodyAsMap.operationName as string
            };
        }

        // Skip requests without content types.
        if (request.headers['content-type'] === undefined) {
            return {
                error: { graphQLError: new GraphQLError('Invalid request. Request header content-type is undefined.'), statusCode: 400 }
            };
        }

        try {
            const typeInfo = contentType.parse(request)

            // If express has already parsed a body as a string, and the content-type
            // was application/graphql, parse the string body.
            if (typeof body === 'string' && typeInfo.type === 'application/graphql') {
                return { query: body };
            }

            // Already parsed body we didn't recognise? Parse nothing.
            if (body != null) {
                return {};
            }

            const rawBody = await this.readBody(request, typeInfo);

            if (typeof rawBody ==='string') {
                // Use the correct body parser based on Content-Type header.
                switch (typeInfo.type) {
                case 'application/graphql':
                    return { query: rawBody };
                case 'application/json':
                    try {
                        return JSON.parse(rawBody);
                    } catch {
                        return {
                            error: { graphQLError: new GraphQLError('POST body contains invalid JSON.'), statusCode: 400 }
                        }
                    }
                case 'application/x-www-form-urlencoded':
                    return this.extractInformationFromUrlParameters(`host?${rawBody}.`)
                }

                // If no Content-Type header matches, parse nothing.
                return {
                    error: { graphQLError: new GraphQLError(`POST body contains invalid content type: ${typeInfo.type}.`), statusCode: 400 }
                }
            } else {
                return {
                    error: rawBody
                }
            }
        } catch {
            return {
                error: { graphQLError: new GraphQLError('Content type could not be parsed.'), statusCode: 400 }
            }
        }
    }

    // Read and parse a request body.
    async readBody(
        req: Request,
        typeInfo: ParsedMediaType,
    ): Promise<string | GraphQLErrorWithStatusCode> {
        const charset = typeInfo.parameters.charset?.toLowerCase() ?? 'utf-8';

        // Assert charset encoding per JSON RFC 7159 sec 8.1
        if (charset !== 'utf8' && charset !== 'utf-8' && charset !== 'utf16le') {
            return {
                graphQLError: new GraphQLError(`Unsupported charset "${charset.toUpperCase()}".`),
                statusCode: 415
            }
        }

        // Get content-encoding (e.g. gzip)
        const contentEncoding = req.headers['content-encoding'];
        const encoding =
            typeof contentEncoding === 'string'
                ? contentEncoding.toLowerCase()
                : 'identity';
        const maxBuffer = 100 * 1024; // 100kb
        const stream = this.decompressed(req, encoding);
        if ('graphQLError' in stream && 'statusCode' in stream) {
            return {
                graphQLError: stream.graphQLError,
                statusCode: stream.statusCode
            }
        }

        // Read body from stream.
        try {
            const buffer = await getStream.buffer(stream, { maxBuffer });
            return buffer.toString(charset);
        } catch (rawError: unknown) {
            if (rawError instanceof MaxBufferError) {
                return {
                    graphQLError: new GraphQLError('Invalid request body: request entity too large.'),
                    statusCode: 413
                }
            } else {
                const message =
                    rawError instanceof Error ? rawError.message : String(rawError);
                return {
                    graphQLError: new GraphQLError(`Invalid request body: ${message}.`),
                    statusCode: 400
                }
            }
        }
    }

    // Return a decompressed stream, given an encoding.
    decompressed(
        req: Request,
        encoding: string,
    ): Request | Inflate | Gunzip | GraphQLErrorWithStatusCode {
        switch (encoding) {
        case 'identity':
            return req;
        case 'deflate':
            return req.pipe(zlib.createInflate());
        case 'gzip':
            return req.pipe(zlib.createGunzip());
        }
        return {
            graphQLError: new GraphQLError(`Unsupported content-encoding "${encoding}".`),
            statusCode: 415
        }
    }
}
