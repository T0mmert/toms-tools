import { defineConfig } from 'vitest/config';

// Date logic (night shifts, DST changes, ISO weeks) depends on the local time
// zone. CI runs in UTC, so pin the user's zone before the test workers start;
// they inherit it from this process.
process.env.TZ = 'Europe/Amsterdam';

// Separate from vite.config.js so tests skip the PWA and React plugins. The
// tests cover pure logic in src/lib, which needs neither.
export default defineConfig({
  test: {
    include: ['src/**/*.test.js'],
    environment: 'node',
  },
});
