import {Buffer} from 'node:buffer'
import { ResponseParameters } from '@dreamit/graphql-server-base'

/**
 * Default implementation of sendResponse function
 */
export function sendResponse(responseParameters: ResponseParameters): void {
    const {
        customHeaders,
        context,
        executionResult,
        logger,
        response,
        statusCode,
        formatErrorFunction,
        responseEndChunkFunction,
    } = responseParameters
    logger.debug(
        `Preparing response with executionResult ${JSON.stringify(executionResult)}`+
            `, status code ${statusCode} and custom headers ${JSON.stringify(customHeaders)}` +
            `, and context ${context}`,
        context
    )
    if (executionResult && executionResult.errors && formatErrorFunction) {
        executionResult.errors.map((element) => formatErrorFunction(element))
    }
    if (statusCode) {
        response.statusCode = statusCode
    }
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    if (customHeaders) {
        for (const [key, value] of Object.entries(customHeaders)) {
            logger.debug(`Set custom header ${key} to ${value}`,
                context)
            response.setHeader(key, String(value))
        }
    }

    if (responseEndChunkFunction) {
        response.end(responseEndChunkFunction(executionResult))
    } else {
        response.end(Buffer.from(JSON.stringify(executionResult), 'utf8'))
    }

}
