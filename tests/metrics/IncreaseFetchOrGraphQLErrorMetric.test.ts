import {
    GraphQLServerOptions,
    defaultCollectErrorMetrics,
    increaseFetchOrGraphQLErrorMetric,
} from '@/index'
import { expect, test } from 'vitest'
import { JsonTestLogger } from '../TestHelpers'

test.each([
    {},
    { collectErrorMetricsFunction: defaultCollectErrorMetrics },
    { logger: new JsonTestLogger(true) },
    {
        collectErrorMetricsFunction: defaultCollectErrorMetrics,
        logger: new JsonTestLogger(true),
    },
])(
    'Test that increaseFetchOrGraphQLErrorMetric does not throw an error' +
        ' logs a debug message if a logger is defined',
    (serverOptions: GraphQLServerOptions) => {
        expect(
            increaseFetchOrGraphQLErrorMetric(undefined, serverOptions, {}),
        ).toBe(undefined)
        const { logger } = serverOptions

        if (logger && logger instanceof JsonTestLogger) {
            expect(logger.logEntries.at(0)?.message).toBe(
                'Calling increaseFetchOrGraphQLErrorMetric with error undefined and errorIsFetch false',
            )
        }
    },
)
