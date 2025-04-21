module.exports = {
  roots: ["<rootDir>/src"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json",
    },
  },
  coverageReporters: ["json", "lcov", "text", "clover"],
};
