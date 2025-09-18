import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/test/{ts,js}/*.test.{ts,cjs,mjs,js}'],
    coverage: {
      reportsDirectory: 'coverage',
      include: ['src/main'],
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
