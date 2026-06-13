module.exports = function (api) {
  api.cache(true);

  let presetName = 'babel-preset-expo';
  try {
    require.resolve(presetName);
  } catch (e) {
    // If babel-preset-expo isn't installed or resolvable in this environment,
    // fall back to the Metro React Native preset to allow bundling to proceed.
    presetName = 'module:metro-react-native-babel-preset';
    // eslint-disable-next-line no-console
    console.warn('[babel] babel-preset-expo not found, falling back to metro preset');
  }

  return {
    presets: [presetName],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};
