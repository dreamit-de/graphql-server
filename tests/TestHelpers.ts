import {GraphQLRequestInfo} from '../src/server/GraphQLServer';

export function generateGetParamsFromGraphQLRequestInfo(requestInfo: GraphQLRequestInfo): string {
    let result=''
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
