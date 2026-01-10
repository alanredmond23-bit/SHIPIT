const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/styles/(.*)$': '<rootDir>/styles/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/e2e/',
  ],
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/tests/**',
    '!**/__tests__/**',
    '!**/e2e/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  testTimeout: 10000,
  verbose: true,
  // Transform settings for modern ESM packages
  transformIgnorePatterns: [
    '/node_modules/(?!(react-markdown|remark-gfm|unified|bail|is-plain-obj|trough|vfile|unist-util-stringify-position|mdast-util-from-markdown|mdast-util-to-string|micromark|decode-named-character-reference|character-entities|property-information|hast-util-whitespace|space-separated-tokens|comma-separated-tokens|rehype-raw|hast-util-raw|hast-util-to-parse5|hast-util-from-parse5|vfile-location|web-namespaces|zwitch|html-void-elements|parse5|hastscript|ccount|escape-string-regexp|markdown-table)/)',
  ],
  // Reporters for CI/CD integration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './coverage',
        outputName: 'junit.xml',
      },
    ],
  ],
  // Watch plugins commented out due to peer dependency conflict with Jest 29
  // watchPlugins: [
  //   'jest-watch-typeahead/filename',
  //   'jest-watch-typeahead/testname',
  // ],
  // Global test setup
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  },
  // Fail fast in CI
  bail: process.env.CI ? 1 : 0,
  // Max workers for parallel execution
  maxWorkers: process.env.CI ? 2 : '50%',
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
