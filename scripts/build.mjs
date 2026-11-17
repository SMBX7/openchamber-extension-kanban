import { build, context } from 'esbuild';

const common = {
  bundle: true,
  legalComments: 'none',
  logLevel: 'info',
  sourcemap: false,
};

const targets = [
  {
    entryPoints: ['src/panel/main.js'],
    outfile: 'panel/main.js',
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
  },
  {
    entryPoints: ['src/status/main.js'],
    outfile: 'status/main.js',
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
  },
  {
    entryPoints: ['src/service/main.js'],
    outfile: 'service/main.js',
    format: 'cjs',
    platform: 'node',
    target: ['node20'],
  },
  {
    entryPoints: ['src/plugin/main.js'],
    outfile: 'plugin/index.mjs',
    format: 'esm',
    platform: 'node',
    target: ['node20'],
    // OpenCode imports the folder with a bare import(): the module has to be
    // ESM, and the shared sources still resolve the package from __dirname.
    banner: {
      js: "import { fileURLToPath as __kanbanFileURLToPath } from 'node:url';\nimport { dirname as __kanbanDirname } from 'node:path';\nconst __dirname = __kanbanDirname(__kanbanFileURLToPath(import.meta.url));",
    },
  },
];

const watch = process.argv.includes('--watch');

for (const options of targets) {
  const config = { ...common, ...options };
  if (watch) {
    const ctx = await context(config);
    await ctx.watch();
  } else {
    await build(config);
  }
}

if (watch) {
  console.log('Watching the extension bundles. Save a file in src/ to rebuild.');
}
