import {
    defaultCollectErrorMetrics,
    increaseFetchOrGraphQLErrorMetric,
} from '@/index'
import { expect, test } from 'vitest'
import { LOGGER } from '../TestHelpers'

test.each([
    {},
    { collectErrorMetricsFunction: defaultCollectErrorMetrics },
    { logger: LOGGER },
    { collectErrorMetricsFunction: defaultCollectErrorMetrics, logger: LOGGER },
])(
    'Should not throw an error when increasing metrics' +
        ' if logger or collect function are undefined',
    (serverOptions) => {
        expect(
            increaseFetchOrGraphQLErrorMetric(undefined, serverOptions, {}),
        ).toBe(undefined)
    },
)
