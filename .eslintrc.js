module.exports = {
  root: true,
  parser:  '@typescript-eslint/parser',
  // parserOptions: {
  //   parser: require.resolve('babel-eslint'),
  //   ecmaVersion: 2018,
  //   sourceType: 'module'
  // },
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    node: true
  },
  plugins: [
    '@typescript-eslint',
    // "flowtype"
  ],
  extends: [
    'plugin:@typescript-eslint/recommended',
    // "eslint:recommended",
    // "plugin:flowtype/recommended"
  ],
  // globals: {
  //   "__WEEX__": true,
  //   "WXEnvironment": true
  // },
  rules: {
    'no-console': process.env.NODE_ENV !== 'production' ? 0 : 2,
    'no-useless-escape': 0,
    'no-empty': 0
  }
}
