// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Apenas mantenha as extensões padrão do Expo. Não adicione 'ts' nem 'tsx' se não estiver usando TypeScript
// Remova sourceExts customizado totalmente, para evitar conflito com arquivos .ts internos do node_modules

// Mantém polyfills necessários
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: require.resolve('react-native-crypto'),
  stream: require.resolve('stream-browserify'),
  events: require.resolve('events/'),
  http: require.resolve('stream-http'),
  https: require.resolve('https-browserify'),
  buffer: require.resolve('buffer/'),
  process: require.resolve('process/browser'),
  url: require.resolve('url/'),
  vm: require.resolve('vm-browserify'),
  path: require.resolve('path-browserify'),
  os: require.resolve('os-browserify/browser'),
  util: require.resolve('util/'),
  net: require.resolve('react-native-tcp-socket'),
  fs: require.resolve('react-native-fs'),
  tls: require.resolve('tls-browserify'),
  zlib: require.resolve('browserify-zlib'),
  assert: require.resolve('assert/'),
  constants: require.resolve('constants-browserify'),
  tty: require.resolve('tty-browserify'),
  domain: require.resolve('domain-browser'),
  querystring: require.resolve('querystring-es3'),
};

module.exports = config;
