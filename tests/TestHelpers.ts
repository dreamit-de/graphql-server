import {GraphQLRequestInfo,
    GraphQLServerOptions,
    JsonLogger} from '../src'
import {userSchema,
    userSchemaResolvers} from './ExampleSchemas'
import fetch from 'cross-fetch'

export const GRAPHQL_SERVER_PORT = 3000
export const LOGGER = new JsonLogger('test-logger', 'myTestService')
export const INITIAL_GRAPHQL_SERVER_OPTIONS: GraphQLServerOptions = {schema: userSchema, rootValue: userSchemaResolvers, logger: LOGGER, debug: true}

export function generateGetParamsFromGraphQLRequestInfo(requestInfo: GraphQLRequestInfo): string {
    let result = ''
    if (requestInfo.query) {
        result += `query=${requestInfo.query}&`
    }
    if (requestInfo.operationName) {
        result += `operationName=${requestInfo.operationName}&`
    }
    if (requestInfo.variables) {
        result += `variables=${JSON.stringify(requestInfo.variables)}`
    }
    return encodeURI(result)
}

export function fetchResponse(body: BodyInit,
    method = 'POST',
    headers: HeadersInit = {
        'Content-Type': 'application/json'
    }): Promise<Response> {
    return fetch(`http://localhost:${GRAPHQL_SERVER_PORT}/graphql`, {method: method, body: body, headers: headers})
}
