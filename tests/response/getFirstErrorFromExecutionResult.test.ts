/* eslint-disable max-len */

import {getFirstErrorFromExecutionResult} from '../../src'

test('Should return error message if no error is available when '+
    'calling getFirstErrorFromExecutionResult', () => {
    const result = getFirstErrorFromExecutionResult({
        executionResult: {
            data: {response: 'doesnotmatter'}
        }
    })
    expect(result.message).toBe('No error found in ExecutionResult!')
})
