module.exports = {
  env: { es2021: true, node: true },
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react-native/all'],
  parserOptions: { ecmaVersion: 12, sourceType: 'module' },
  plugins: ['react', 'react-native'],
  rules: { 'react/prop-types': 'off', 'react-native/no-unused-styles': 'error', 'prettier/prettier': 'error' },
};
