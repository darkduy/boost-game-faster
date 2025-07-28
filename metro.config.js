module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transformOptions: {
        enableBabelRCLookup: false,
        enableBabelRuntime: true,
      },
    }),
  },
  resolver: {
    sourceExts: ['jsx', 'js', 'ts', 'tsx'],
  },
};
