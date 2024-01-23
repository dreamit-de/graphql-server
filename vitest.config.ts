import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [tsconfigPaths()],
    resolve: { alias: { graphql: 'graphql/index.js' } },
    test: {
        coverage: {
            exclude: ['build', 'tests'],
            provider: 'v8',
            reporter: ['text'],
        },
        exclude: ['node_modules', 'build', '.idea', '.git', '.cache'],
    },
})
