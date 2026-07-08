// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle audio assets (SFX + future voice lines).
config.resolver.assetExts = Array.from(
  new Set([...config.resolver.assetExts, 'wav', 'mp3', 'm4a', 'ogg']),
);

module.exports = config;
