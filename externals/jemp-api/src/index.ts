import { Connection, Client } from '@temporalio/client';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { versionCheckHandler } from './routes/version-check-route';
import storeInfoRouter from './store-info-route';

dotenv.config();

const app = express();
app.use(helmet());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE ?? 'default';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Health check
app.get('/health', (_req, res) => {
    res.json({ ok: true });
});

// Version check
app.get('/version-check', versionCheckHandler);

// Store info
app.use('/store-info', storeInfoRouter);

// POST /api/plan-generation/start
app.post('/api/plan-generation/start', async (req, res) => {
    // 1. Auth — verify Supabase JWT from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    // 2. Create job row
    const { data: job, error: insertError } = await supabase
        .from('plan_generation_jobs')
        .insert({ user_id: user.id, status: 'pending' })
        .select('id')
        .single();

    if (insertError || !job) {
        console.error('plan-generation/start: insert failed', insertError);
        res.status(500).json({ error: 'Failed to create job' });
        return;
    }

    // 3. Start Temporal workflow
    let connection: Connection | null = null;
    try {
        connection = await Connection.connect({ address: TEMPORAL_ADDRESS });
        const client = new Client({ connection, namespace: TEMPORAL_NAMESPACE });

        await client.workflow.start('generatePlanWorkflow', {
            taskQueue: 'jemp-queue',
            workflowId: `generate-plan-${job.id}`,
            args: [{ userId: user.id, jobId: job.id }],
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('plan-generation/start: workflow.start failed', message);
        await supabase
            .from('plan_generation_jobs')
            .update({ status: 'error', error: message })
            .eq('id', job.id);
        res.status(500).json({ error: 'Failed to start workflow' });
        return;
    } finally {
        await connection?.close();
    }

    res.json({ job_id: job.id });
});

app.listen(PORT, () => {
    console.log(`jemp-api listening on port ${PORT}`);
    console.log(`Temporal: ${TEMPORAL_ADDRESS} (namespace: ${TEMPORAL_NAMESPACE})`);
});
