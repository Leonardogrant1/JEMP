import { Connection, Client } from '@temporalio/client'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // 1. Auth — verify Supabase JWT from Authorization header
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Create job row
  const { data: job, error: insertError } = await supabase
    .from('plan_generation_jobs')
    .insert({ user_id: user.id, status: 'pending' })
    .select('id')
    .single()

  if (insertError || !job) {
    console.error('plan-generation/start: insert failed', insertError)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }

  // 3. Start Temporal workflow
  const temporalAddress = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233'
  const namespace = process.env.TEMPORAL_NAMESPACE ?? 'default'

  try {
    const connection = await Connection.connect({ address: temporalAddress })
    const client = new Client({ connection, namespace })

    await client.workflow.start('generatePlanWorkflow', {
      taskQueue: 'jemp-queue',
      workflowId: `generate-plan-${job.id}`,
      args: [{ userId: user.id, jobId: job.id }],
    })

    await connection.close()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('plan-generation/start: workflow.start failed', message)
    // Mark job as error so the app doesn't spin forever
    await supabase
      .from('plan_generation_jobs')
      .update({ status: 'error', error: message })
      .eq('id', job.id)
    return NextResponse.json({ error: 'Failed to start workflow' }, { status: 500 })
  }

  return NextResponse.json({ job_id: job.id })
}
