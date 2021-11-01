import {GraphQLSchema} from 'graphql'
import {IncomingMessage,
    ServerResponse} from 'http'

type Request = IncomingMessage & { url: string }
type Response = ServerResponse & { json?: (data: unknown) => void }

export class GraphQLServer {

    private schema: GraphQLSchema

    constructor(schema: GraphQLSchema) {
        this.schema = schema
    }

    getSchema(): GraphQLSchema {
        return this.schema
    }

    updateSchema(schema: GraphQLSchema): void {
        this.schema = schema
    }

    async handleRequest(request: Request, response: Response): Promise<void> {
        return this.createResponse(response,  JSON.stringify({data:{response:'hello world'}}) )
    }

    createResponse(response: Response, data: string): void {
        response.statusCode = 200
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.end(Buffer.from(data, 'utf8'))
    }
}
