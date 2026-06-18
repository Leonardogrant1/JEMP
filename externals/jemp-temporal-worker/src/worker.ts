/**
 * TEMPORAL WORKER: entry point
 *
 * This file starts the Worker process with two separate task queues:
 *  - memolib-queue:       Playlists, Quizzes, Flashcards
 *  - memolib-demo-queue:  Demo workflows (isolated, own concurrency)
 *
 * A single NativeConnection is shared between both Workers.
 * Both Workers run in the same process via Promise.all — no extra deployment needed.
 *
 * HOW TEMPORAL WORKS (overview):
 *
 *  1. HTTP server (memolib-backend) calls temporalClient.workflow.start()
 *     → This sends a "start workflow" command to the Temporal server.
 *     → The HTTP request returns immediately (202 Accepted).
 *
 *  2. The Temporal Server persists the Workflow, then puts a task on the task queue.
 *
 *  3. THIS Worker process is polling that task queue.
 *     → It receives the task and runs the Workflow function (playlist-workflow.ts).
 *     → The Workflow calls acts.processSource() → Temporal schedules an Activity task.
 *
 *  4. The Worker also runs the Activity (processSource, storeVectors, etc.)
 *     → Each Activity runs, reports completion back to Temporal.
 *     → If it fails → Temporal retries it automatically (up to maximumAttempts).
 *
 *  5. If the Worker crashes mid-Workflow, Temporal detects it and re-schedules
 *     the remaining work on any other available Worker.
 *
 * KEY CONCEPT — Workflow Sandbox:
 * Workflows run in an isolated V8 context (not Node.js globals). That's why
 * we pass the path to the workflow FILE (not import it directly).
 * Activities run in normal Node.js context.
 */

import { Worker, NativeConnection } from '@temporalio/worker';
import { Client } from '@temporalio/client';
import * as allActivities from './activities';
import * as dotenv from 'dotenv';
import { startJobPoller } from './job-poller';

dotenv.config();

async function main() {
    // Connect to the Temporal server.
    // TEMPORAL_ADDRESS should be set in your .env (e.g. "temporal-server.fly.dev:7233" or "localhost:7233")
    const connection = await NativeConnection.connect({
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
        // For Temporal Cloud (if you ever switch): add tls config here
    });

    const namespace = process.env.TEMPORAL_NAMESPACE || 'default';

    // Workflow bundle config — shared by both Workers (same bundle file)
    const workflowBundleConfig = process.env.NODE_ENV === 'production'
        ? { workflowBundle: { codePath: require.resolve('./workflows/index.js') } }
        : { workflowsPath: require.resolve('./workflows/index.ts') };

    // Split activities: demo gets only its activity; main gets everything else
    const { executeDemoHandler, ...mainActivities } = allActivities;

    // Worker 1: Playlists, Quizzes, Flashcards
    const mainWorker = await Worker.create({
        connection,
        namespace,
        taskQueue: 'memolib-queue',
        ...workflowBundleConfig,
        activities: mainActivities,
        // How many activities can run in parallel on this Worker.
        // Keeps the DB pool from exhausting across all active Workflows.
        maxConcurrentActivityTaskExecutions: 3,
    });

    // Worker 2: Demo (isolated queue, higher concurrency for fast parallel demo jobs)
    const demoWorker = await Worker.create({
        connection,
        namespace,
        taskQueue: 'memolib-demo-queue',
        ...workflowBundleConfig,
        activities: { executeDemoHandler },
        maxConcurrentActivityTaskExecutions: 5,
    });

    // Worker 3: JEMP plan generation
    const jempWorker = await Worker.create({
        connection,
        namespace,
        taskQueue: 'jemp-queue',
        ...workflowBundleConfig,
        activities: allActivities,  // includes all activities including new JEMP ones
        maxConcurrentActivityTaskExecutions: 2,  // plan gen is I/O heavy
    });

    console.log('Temporal Workers started: memolib-queue (playlist, quiz, flashcard) + memolib-demo-queue (demo)');
    console.log('JEMP worker started: jemp-queue (plan generation)');
    console.log(`Connected to Temporal server: ${process.env.TEMPORAL_ADDRESS || 'localhost:7233'}`);

    // Start job poller — reuse the NativeConnection for the Temporal client (avoids second TCP connection)
    const temporalClient = new Client({ connection, namespace });
    startJobPoller(temporalClient);

    // Promise.all blocks until all Workers are shut down.
    // Fly.io sends SIGTERM before shutting down — Temporal Workers handle this
    // gracefully by finishing in-progress activities before stopping.
    await Promise.all([mainWorker.run(), demoWorker.run(), jempWorker.run()]);
}

main().catch(err => {
    console.error('Temporal Worker failed to start:', err);
    process.exit(1);
});
