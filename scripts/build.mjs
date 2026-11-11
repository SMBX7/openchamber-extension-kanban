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
    entryPoints: ['src/mcp/main.js'],
    outfile: 'mcp/main.js',
    format: 'cjs',
    platform: 'node',
    target: ['node20'],
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
