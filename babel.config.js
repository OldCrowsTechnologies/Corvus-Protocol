module.exports = function (api) {
  api.cache(true);
  return {
    // unstable_transformImportMeta: zustand v5 references `import.meta.env`, which
    // Hermes (native) and classic web scripts can't parse. This rewrites it safely.
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: { '@': './src' },
        },
      ],
    ],
  };
};
