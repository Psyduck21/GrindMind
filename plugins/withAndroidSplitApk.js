const { withAppBuildGradle } = require('@expo/config-plugins');

const withAndroidSplitApk = (config) => {
  return withAppBuildGradle(config, async (config) => {
    let contents = config.modResults.contents;
    
    // Try to find the standard React Native flag and flip it to true
    if (contents.includes('def enableSeparateBuildPerCPUArchitecture = false')) {
      contents = contents.replace(
        /def enableSeparateBuildPerCPUArchitecture = false/g,
        'def enableSeparateBuildPerCPUArchitecture = true'
      );
    } else {
      // Fallback: forcefully add the splits block to the android configuration
      contents += `
android {
    splits {
        abi {
            enable true
            reset()
            include "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
            universalApk false
        }
    }
}
`;
    }

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withAndroidSplitApk;
