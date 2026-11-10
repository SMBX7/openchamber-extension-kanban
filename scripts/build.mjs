import { build } from 'esbuild';

const common = {
  bundle: true,
  legalComments: 'none',
  logLevel: 'info',
  sourcemap: false,
};

await build({
  ...common,
  entryPoints: ['src/panel/main.js'],
  outfile: 'panel/main.js',
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
});

await build({
  ...common,
  entryPoints: ['src/status/main.js'],
  outfile: 'status/main.js',
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
});

await build({
  ...common,
  entryPoints: ['src/service/main.js'],
  outfile: 'service/main.js',
  format: 'cjs',
  platform: 'node',
  target: ['node20'],
});

await build({
  ...common,
  entryPoints: ['src/mcp/main.js'],
  outfile: 'mcp/main.js',
  format: 'cjs',
  platform: 'node',
  target: ['node20'],
});
