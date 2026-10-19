const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// No custom resolveRequest — Expo 51 handles WebRTC natively.
config.resolver.sourceExts.push('cjs');
module.exports = config;
