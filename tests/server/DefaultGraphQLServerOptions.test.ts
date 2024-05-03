import { DefaultGraphQLServerOptions } from '@/index'
import { expect, test } from 'vitest'

test('Creating DefaultGraphQLServerOptions should provide useful defaults', () => {
    const defaultGraphqlServerOptions = new DefaultGraphQLServerOptions()
    expect(defaultGraphqlServerOptions.customValidationRules).toStrictEqual([])
    expect(defaultGraphqlServerOptions.removeValidationRecommendations).toBe(
        true,
    )
    expect(defaultGraphqlServerOptions.reassignAggregateError).toBe(false)
})
