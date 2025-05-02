import { ResponseParameters } from '@dreamit/graphql-server-base'
import { GraphQLError } from 'graphql'
import { getResponseSchemaValidationErrors } from '../validation/GetResponseSchemaValidationErrors'

/**
 * Default implementation of sendResponse function
 */
export function sendResponse(responseParameters: ResponseParameters): void {
    const {
        customHeaders,
        context,
        logger,
        response,
        statusCode,
        formatErrorFunction,
        responseEndChunkFunction,
        responseStandardSchema,
    } = responseParameters
    let executionResult = responseParameters.executionResult
    logger.debug(
        `Preparing response with executionResult ${JSON.stringify(executionResult)}` +
            `, status code ${statusCode} and custom headers ${JSON.stringify(customHeaders)}` +
            `, and context ${context}`,
        context,
    )

    try {
        const validationErrors = getResponseSchemaValidationErrors(
            responseStandardSchema,
            executionResult,
        )
        if (validationErrors) {
            executionResult = {
                errors: validationErrors.map(
                    (error) => new GraphQLError(error.message, {}),
                ),
            }
        }
    } catch (error: unknown) {
        logger.error(
            'An error occurred while validating the response:',
            context,
            error as TypeError,
            'ResponseValidationError',
        )
    }

    if (executionResult.errors) {
        executionResult.errors.map((element) => formatErrorFunction(element))
    }
    if (statusCode) {
        response.statusCode = statusCode
    }

    if (response.setHeader) {
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
    } else if (response.header) {
        response.header('Content-Type', 'application/json; charset=utf-8')
    } else {
        logger.error(
            'Cannot set content-type header because neither setHeader nor header function is available:',
            context,
            new Error('MissingHeaderFunction'),
            'MissingHeaderFunctionError',
        )
    }

    if (customHeaders) {
        for (const [key, value] of Object.entries(customHeaders)) {
            logger.debug(`Set custom header ${key} to ${value}`, context)

            if (response.setHeader) {
                response.setHeader(key, String(value))
            } else if (response.header) {
                response.header(key, String(value))
            } else {
                logger.error(
                    'Cannot set custom header because neither setHeader nor header function is available:',
                    context,
                    new Error('MissingHeaderFunction'),
                    'MissingHeaderFunctionError',
                )
                // If neither setHeader nor header function is available it does not make sense to continue
                break
            }
        }
    }

    if (response.end) {
        response.end(responseEndChunkFunction(executionResult))
    } else if (response.send) {
        response.send(responseEndChunkFunction(executionResult))
    } else {
        logger.error(
            'Cannot send response because neither end nor send function is available:',
            context,
            new Error('MissingSendFunction'),
            'MissingSendFunctionError',
        )
    }
}
