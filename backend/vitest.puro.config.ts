import dotenv from 'dotenv';
dotenv.config();
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 60000,
    include: ['tests/puros/**/*.test.ts'],
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
});
