import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [tsconfigPaths()],
    resolve: { alias: { graphql: 'graphql/index.js' } },
    test: {
        coverage: {
            exclude: ['.stryker-tmp', 'build', 'tests'],
            provider: 'v8',
            reporter: ['text'],
        },
        exclude: [
            '.stryker-tmp',
            'node_modules',
            'build',
            '.idea',
            '.git',
            '.cache',
        ],
    },
})
