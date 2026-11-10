const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Packages that ship raw TypeScript source via the "source" field in package.json.
// Metro picks "source" over "main" for React Native, but their src trees are
// incomplete at runtime (missing web/platform splits, etc.). Force the compiled
// lib output for each of them.
const FORCE_COMPILED = {
  "react-native-reanimated": path.resolve(
    __dirname,
    "node_modules/react-native-reanimated/lib/module/index"
  ),
  "phosphor-react-native": path.resolve(
    __dirname,
    "node_modules/phosphor-react-native/lib/module/index"
  ),
};

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (FORCE_COMPILED[moduleName]) {
    return { filePath: FORCE_COMPILED[moduleName] + ".js", type: "sourceFile" };
  }
  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

config.resolver.unstable_enablePackageExports = false;

module.exports = config;
