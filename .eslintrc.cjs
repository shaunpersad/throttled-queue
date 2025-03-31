module.exports = {
  extends: [
    'airbnb-typescript/base',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  plugins: ['import'],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    'no-param-reassign': 'off',
    'no-void': 'off',
    "max-len": ["error", { "code": 120 }],
    '@typescript-eslint/no-loop-func': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-misused-promises': 'off',
    '@typescript-eslint/no-unused-expressions': 'off',
    '@typescript-eslint/restrict-template-expressions': 'off',
    'import/no-cycle': 'off',
    'import/prefer-default-export': 'off',
    'no-plusplus': 'off',
  },
  ignorePatterns: ["node_modules/", "dist/"]
};
