const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function build() {
  const outdir = path.join(__dirname, '..', 'dist');

  // Clean output directory
  if (fs.existsSync(outdir)) {
    fs.rmSync(outdir, { recursive: true });
  }
  fs.mkdirSync(outdir, { recursive: true });

  // Build orchestrator (for Fargate)
  const orchestratorOutdir = path.join(outdir, 'orchestrator');
  fs.mkdirSync(orchestratorOutdir, { recursive: true });

  await esbuild.build({
    entryPoints: [path.join(__dirname, '..', 'src', 'orchestrator', 'index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.join(orchestratorOutdir, 'index.js'),
    external: ['@aws-sdk/*'],
    sourcemap: true,
    minify: false, // Keep readable for debugging
  });

  console.log('Built: orchestrator');

  console.log('Build complete!');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
