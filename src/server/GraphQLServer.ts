import {GraphQLSchema} from 'graphql'
import {IncomingMessage,
    ServerResponse} from 'http'
import {Logger} from '../logger/Logger';
import {GraphQLServerOptions} from './GraphQLServerOptions';
import {TextLogger} from '../logger/TextLogger';

type Request = IncomingMessage & { url: string }
type Response = ServerResponse & { json?: (data: unknown) => void }
const fallbackTextLogger = new TextLogger('undefinedLogger', 'undefinedService');

export class GraphQLServer {
    private logger!: Logger
    private debug!: boolean
    private schema?: GraphQLSchema

    constructor(options?: GraphQLServerOptions) {
        this.setOptions(options)
    }

    setOptions(options?: GraphQLServerOptions): void {
        this.schema = options ? options.schema :  undefined
        this.logger = options ?  options.logger || fallbackTextLogger : fallbackTextLogger
        this.debug = options ? options.debug || false : false
    }

    getSchema(): GraphQLSchema | undefined {
        return this.schema
    }

    updateSchema(schema?: GraphQLSchema): void {
        this.logger.info('Trying to update graphql schema')
        this.logDebugIfEnabled(`Schema is  ${JSON.stringify(schema)}`)
        if (this.shouldUpdateSchema(schema)) {
            this.schema = schema
        } else {
            this.logger.warn('Schema update was rejected because condition set in "shouldUpdateSchema" check was not fulfilled.')
        }
    }

    /** Checks whether a schema update should be executed. Default behaviour: If schema is undefined return false.
     * @param {GraphQLSchema} schema - The new schema to use as updated schema.
     * @returns {boolean} True if schema should be updated, false if not
     */
    shouldUpdateSchema(schema?: GraphQLSchema): boolean {
        return !!schema;
    }

    async handleRequest(request: Request, response: Response): Promise<void> {
        const exampleResponse = JSON.stringify({data:{response:'hello world'}})
        this.logDebugIfEnabled(`Create response from data ${exampleResponse}`)
        return this.createResponse(response, exampleResponse)
    }

    createResponse(response: Response, data: string): void {
        response.statusCode = 200
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.end(Buffer.from(data, 'utf8'))
    }

    logDebugIfEnabled(message: string): void {
        if (this.debug) {
            this.logger.debug(message)
        }
    }
}
