import {
    getContentType,
    RequestInformationExtractor
} from '..'
import {URLSearchParams} from 'node:url'
import {GraphQLError} from 'graphql'
import {Buffer} from 'node:buffer'
import { 
    ContentType, 
    GraphQLRequestInfo, 
    GraphQLServerRequest 
} from '@dreamit/graphql-server-base'

/**
 * Default implementation of RequestInformationExtractor interface
 */
export class DefaultRequestInformationExtractor implements RequestInformationExtractor {

    extractInformationFromRequest(request: GraphQLServerRequest)
    : GraphQLRequestInfo {
        const extractedURLParameters = this.extractInformationFromUrlParameters(request.url ?? '')
        const extractedBody = this.extractInformationFromBody(request)
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
    extractInformationFromBody(request: GraphQLServerRequest)
    : GraphQLRequestInfo {
        const { body } = request
        const bodyIsString = typeof body === 'string'
        const bodyIsObject = typeof body === 'object'

        if (!bodyIsString && !bodyIsObject) {
            return {
                error: {
                    graphQLError: new GraphQLError(
                        `POST body contains invalid type ${typeof body}. ` +
                        'Only "object" and "string" are supported.', {}
                    ), statusCode: 400
                }
            }
        } else if (bodyIsObject && body instanceof Buffer) {
            return {
                error: {
                    graphQLError: new GraphQLError('Cannot extract information from ' +
                        'body because it contains an object buffer!', {}), statusCode: 400
                }
            }
        }

        // eslint-disable-next-line unicorn/consistent-destructuring
        const contentTypeFromHeader = request.headers['content-type']

        if (contentTypeFromHeader === undefined) {
            return {
                error: {
                    graphQLError: new GraphQLError('Invalid request. ' +
                        'Request header content-type is undefined.', {}),
                    statusCode: 400
                }
            }
        }

        const contentType = getContentType(contentTypeFromHeader)
        switch (contentType) {
        case ContentType.graphql: {
            return { query: bodyIsString ? body : JSON.stringify(body) }
        }
        case ContentType.json: {
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
        }
        case ContentType.urlencoded: {
            return this.extractInformationFromUrlParameters(`host?${body}.`)
        }
        case ContentType.unknown: {
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
    }
}
