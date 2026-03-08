import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use jsdom for DOM testing (needed for Phaser scene mock objects)
    environment: 'jsdom',

    // Enable top-level await and global test functions (describe, it, expect)
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],

      // Track coverage for core game logic
      include: ['src/**/*.js'],

      // Exclude Phaser scene files (require full runtime) and entry point
      exclude: ['src/main.js', 'src/scenes/*.js'],
    },
  },
});
