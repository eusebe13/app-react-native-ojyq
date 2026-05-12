import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: { strict: true, jsx: "react-jsx" } }],
  },
  moduleNameMapper: {
    // Mock Firebase and native modules not available in Node test env
    // (must come before the @/ catch-all so specific paths match first)
    "^firebase/firestore$": "<rootDir>/__mocks__/firebase-firestore.ts",
    "^@/firebaseConfig$": "<rootDir>/__mocks__/firebaseConfig.ts",
    "^@/hooks/use-auth$": "<rootDir>/__mocks__/use-auth.ts",
    "^expo-notifications$": "<rootDir>/__mocks__/expo-notifications.ts",
    "^react-native$": "<rootDir>/__mocks__/react-native.ts",
    "^@/(.*)$": "<rootDir>/$1",
  },
};

export default config;
