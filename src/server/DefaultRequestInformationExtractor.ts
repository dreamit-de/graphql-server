import {
    GraphQLRequestInfo,
    GraphQLServerRequest,
    RequestInformationExtractor
} from '..'
import {URLSearchParams} from 'node:url'
import {GraphQLError} from 'graphql'
import {Buffer} from 'node:buffer'

export enum ContentType {
    graphql,
    json,
    unknown,
    urlencoded
}

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
        const bodyIsString = typeof body === 'string'
        const bodyIsObject = typeof body === 'object'

        if (!bodyIsString && !bodyIsObject) {
            return {
                error: {
                    graphQLError: new GraphQLError(
                        `POST body contains invalid type ${typeof body}.`, {}
                    ), statusCode: 400
                }
            }
        } else if (bodyIsObject && body instanceof Buffer) {
            return {
                error: {
                    graphQLError: new GraphQLError('Cannot handle body when it contains' +
                        ' an object buffer!', {}), statusCode: 400
                }
            }
        }

        // eslint-disable-next-line unicorn/consistent-destructuring
        const contentTypeFromHeader = request.headers['content-type']

        // Skip requests without content types.
        if (contentTypeFromHeader === undefined) {
            return {
                error: {
                    graphQLError: new GraphQLError('Invalid request. ' +
                        'Request header content-type is undefined.', {}),
                    statusCode: 400
                }
            }
        }

        const contentType = this.getContentType(contentTypeFromHeader)
        switch (contentType) {
        case ContentType.graphql:
            return { query: bodyIsString ? body : JSON.stringify(body) }
        case ContentType.json:
            if (bodyIsString)  {
                try {
                    const bodyAsJson = JSON.parse(body)
                    return {
                        query: bodyAsJson.query,
                        variables: bodyAsJson.variables as Readonly<Record<string, unknown>>
                            | null || undefined,
                        operationName: bodyAsJson.operationName
                    }
                } catch {
                    return {
                        error: {
                            graphQLError: new GraphQLError('POST body' +
                                ' contains invalid JSON.', {}), statusCode: 400
                        }
                    }
                }
            } else {
                const bodyAsMap = body as Record<string, unknown>
                return {
                    query: bodyAsMap.query as string,
                    variables: bodyAsMap.variables as Readonly<Record<string, unknown>>
                        | null || undefined,
                    operationName: bodyAsMap.operationName as string
                }
            }
        case ContentType.urlencoded:
            return this.extractInformationFromUrlParameters(`host?${body}.`)
        case ContentType.unknown:
            return {
                error: {
                    graphQLError: new GraphQLError(
                        'POST body contains invalid content type: ' +
                            // eslint-disable-next-line unicorn/consistent-destructuring
                            `${request.headers['content-type']}.`, {}
                    ), statusCode: 400
                }
            }
        }
    }

    getContentType(contentType: string | undefined): ContentType {
        if (contentType) {
            if (contentType.includes('application/graphql')) {
                return ContentType.graphql
            }  else if (contentType.includes('application/json')) {
                return ContentType.json
            } else if (contentType.includes('application/x-www-form-urlencoded')) {
                return ContentType.urlencoded
            }
        }
        return ContentType.unknown
    }
}
