module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^obsidian$': '<rootDir>/__mocks__/obsidian.ts',
    '^@codemirror/state$': '<rootDir>/__mocks__/codemirror-state.ts',
    '^@codemirror/view$': '<rootDir>/__mocks__/codemirror-view.ts',
    '^@codemirror/language$': '<rootDir>/__mocks__/codemirror-language.ts',
    '^@codemirror/search$': '<rootDir>/__mocks__/codemirror-search.ts'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};