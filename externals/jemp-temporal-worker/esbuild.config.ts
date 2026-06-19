import { TsconfigPathsPlugin } from '@esbuild-plugins/tsconfig-paths';
import { bundleWorkflowCode } from '@temporalio/worker';
import { build } from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import fs from 'fs/promises';
import * as path from 'path';

async function bundle() {
    try {
        // 1. Build the worker
        await build({
            entryPoints: ['src/worker.ts'],
            bundle: true,
            platform: 'node',
            target: 'node22',
            outfile: 'dist/worker.js',
            plugins: [
                TsconfigPathsPlugin({ tsconfig: './tsconfig.json' }),
                nodeExternalsPlugin(),
            ],
            sourcemap: true,
            minify: process.env.NODE_ENV === 'production',
        });

        // 2. Build the workflows separately using Temporal's official bundler
        // This ensures the exact same @temporalio/worker version is used for bundling and creating the Worker

        console.log('Bundling workflows...');
        const code = await bundleWorkflowCode({
            workflowsPath: require.resolve('./src/workflows/index.ts'),
            // Webpack uses the target to build the bundle.
            // Node 22 is fine, but temporal defaults to the current node version.
        });

        // Ensure the dist/workflows directory exists
        const workflowsDistDir = path.join(__dirname, 'dist', 'workflows');
        await fs.mkdir(workflowsDistDir, { recursive: true });

        // Write the bundled code to the dist/workflows/index.js file
        await fs.writeFile(path.join(workflowsDistDir, 'index.js'), code.code);


        console.log('Build completed successfully.');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

bundle();
