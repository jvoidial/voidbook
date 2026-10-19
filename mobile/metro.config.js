const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Expo 51 + WebRTC fix: Do NOT add custom resolveRequest for event-target-shim
// as it conflicts with React Native 0.74's internal resolver.

module.exports = config;
