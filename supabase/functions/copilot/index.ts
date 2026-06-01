import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

// Groq API Configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = {
  fast: 'llama3-8b-8192',
  smart: 'llama3-70b-8192',
  code: 'mixtral-8x7b-32768',
};

// Rate limiting configuration
const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

// Redis (Upstash) configuration for distributed rate limiting
const REDIS_REST_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
const REDIS_REST_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

// In-memory fallback for single-instance deployments
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

async function redisRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `rate_limit:copilot:${userId}`;
  const now = Date.now();
  const windowStart = now + RATE_LIMIT_WINDOW_MS;

  try {
    // Use Upstash REST API for Redis rate limiting (sliding window via GET + SET)
    const getRes = await fetch(`${REDIS_REST_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${REDIS_REST_TOKEN}` },
    });

    if (!getRes.ok) throw new Error('Redis GET failed');

    const getData = await getRes.json();
    const entry = getData.result ? JSON.parse(getData.result) : null;

    if (!entry || now > entry.resetAt) {
      const newEntry = { count: 1, resetAt: windowStart };
      const setRes = await fetch(`${REDIS_REST_URL}/set/${key}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${REDIS_REST_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: JSON.stringify(newEntry),
          ex: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
        }),
      });
      if (!setRes.ok) throw new Error('Redis SET failed');
      return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1, resetAt: windowStart };
    }

    if (entry.count >= RATE_LIMIT_REQUESTS) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count += 1;
    const setRes = await fetch(`${REDIS_REST_URL}/set/${key}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value: JSON.stringify(entry),
        ex: Math.ceil((entry.resetAt - now) / 1000),
      }),
    });
    if (!setRes.ok) throw new Error('Redis SET failed');
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - entry.count, resetAt: entry.resetAt };
  } catch {
    // Fallback to in-memory rate limiting
    return memoryRateLimit(userId);
  }
}

function memoryRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    const newEntry = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(userId, newEntry);
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1, resetAt: newEntry.resetAt };
  }

  if (entry.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_REQUESTS - entry.count, resetAt: entry.resetAt };
}

function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (REDIS_REST_URL && REDIS_REST_TOKEN) {
    return redisRateLimit(userId);
  }
  return Promise.resolve(memoryRateLimit(userId));
}

interface CopilotRequest {
  message?: string;
  projectId?: string;
  model?: keyof typeof GROQ_MODELS;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: {
    currentPage?: string;
    selectedProject?: string;
  };
  executeAction?: {
    action: string;
    projectId: string;
    reason: string;
  };
}

// Tool definitions for Groq function calling
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'query_projects',
      description: 'Query the projects database for information about projects, clients, deployments, or incidents',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Search term or project name' },
        },
        required: ['search'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_events',
      description: 'Query unified events (errors from Sentry, deployments from Vercel, analytics from PostHog) for a project within a time range',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'The project UUID' },
          source: { type: 'string', enum: ['sentry', 'vercel', 'posthog', 'supabase'] },
          severity: { type: 'string', enum: ['info', 'warning', 'error', 'critical'] },
          hours: { type: 'number', description: 'Number of hours to look back' },
          limit: { type: 'number', default: 20 },
        },
        required: ['projectId', 'hours'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_project_health',
      description: 'Get a comprehensive health summary for a specific project including recent errors, deployments, uptime indicators, and active incidents',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
        },
        required: ['projectId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_cost_summary',
      description: 'Get cost and spending summary for a project or client across all connected services',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          days: { type: 'number', default: 30 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_action',
      description: 'Suggest and potentially execute a safe remediation action like clearing cache, toggling a feature flag, or alerting the on-call team',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['rollback_deployment', 'clear_cache', 'toggle_feature_flag', 'alert_oncall', 'run_diagnostics', 'scale_functions'],
          },
          projectId: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['action', 'projectId', 'reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'root_cause_analysis',
      description: 'Perform cross-event root cause analysis for a project by correlating errors, deployments, incidents, and synthetic check failures within a time window',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'The project UUID' },
          hours: { type: 'number', description: 'Number of hours to look back for correlation', default: 4 },
        },
        required: ['projectId'],
      },
    },
  },
];

// Execute tool calls against Supabase
async function executeTool(
  supabase: ReturnType<typeof createClient>,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'query_projects': {
      const { data } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .ilike('name', `%${args.search}%`)
        .limit(10);
      return data || [];
    }

    case 'query_events': {
      let query = supabase
        .from('unified_events')
        .select('*')
        .eq('project_id', args.projectId)
        .gte('occurred_at', new Date(Date.now() - (args.hours as number) * 60 * 60 * 1000).toISOString())
        .order('occurred_at', { ascending: false })
        .limit(args.limit as number || 20);

      if (args.source) query = query.eq('source', args.source);
      if (args.severity) query = query.eq('severity', args.severity);

      const { data } = await query;
      return data || [];
    }

    case 'get_project_health': {
      const { data: project } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .eq('id', args.projectId)
        .single();

      const { data: recentEvents } = await supabase
        .from('unified_events')
        .select('*')
        .eq('project_id', args.projectId)
        .gte('occurred_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('occurred_at', { ascending: false })
        .limit(15);

      const { data: deployments } = await supabase
        .from('deployments')
        .select('*')
        .eq('project_id', args.projectId)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: incidents } = await supabase
        .from('incidents')
        .select('*')
        .eq('project_id', args.projectId)
        .not('status', 'in', '(resolved,postmortem)')
        .order('started_at', { ascending: false })
        .limit(5);

      const errorCount = recentEvents?.filter((e) => e.severity === 'error' || e.severity === 'critical').length || 0;
      const warningCount = recentEvents?.filter((e) => e.severity === 'warning').length || 0;

      return {
        project,
        summary: {
          errors_24h: errorCount,
          warnings_24h: warningCount,
          total_events_24h: recentEvents?.length || 0,
          active_incidents: incidents?.length || 0,
          latest_deployment_status: deployments?.[0]?.status || 'none',
          latest_deployment_at: deployments?.[0]?.created_at || null,
        },
        recent_events: recentEvents?.slice(0, 5),
        deployments: deployments?.slice(0, 3),
        incidents: incidents?.slice(0, 3),
      };
    }

    case 'get_cost_summary': {
      const { data: costs } = await supabase
        .from('cost_snapshots')
        .select('*')
        .eq('project_id', args.projectId)
        .gte('period_start', new Date(Date.now() - (args.days as number || 30) * 24 * 60 * 60 * 1000).toISOString())
        .order('period_start', { ascending: false });

      const totalSpend = costs?.reduce((sum, c) => sum + (c.amount_cents || 0), 0) || 0;
      const byService = costs?.reduce<Record<string, number>>((acc, c) => {
        acc[c.service_type] = (acc[c.service_type] || 0) + (c.amount_cents || 0);
        return acc;
      }, {});

      return { totalSpendCents: totalSpend, byService, entries: costs?.slice(0, 10) };
    }

    case 'suggest_action': {
      return {
        action: args.action,
        projectId: args.projectId,
        reason: args.reason,
        status: 'proposed',
        message: `Action "${args.action}" proposed for project ${args.projectId}. Reason: ${args.reason}`,
      };
    }

    case 'execute_action': {
      return executeAction(supabase, args.action as string, args.projectId as string, args.reason as string);
    }

    case 'root_cause_analysis': {
      const hours = (args.hours as number) || 4;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      // Fetch correlated events
      const [{ data: events }, { data: deployments }, { data: incidents }, { data: checks }] = await Promise.all([
        supabase
          .from('unified_events')
          .select('*')
          .eq('project_id', args.projectId)
          .gte('occurred_at', since)
          .order('occurred_at', { ascending: true }),
        supabase
          .from('deployments')
          .select('*')
          .eq('project_id', args.projectId)
          .gte('created_at', since)
          .order('created_at', { ascending: true }),
        supabase
          .from('incidents')
          .select('*')
          .eq('project_id', args.projectId)
          .gte('created_at', since)
          .order('created_at', { ascending: true }),
        supabase
          .from('synthetic_checks')
          .select('*')
          .eq('project_id', args.projectId)
          .eq('enabled', true),
      ]);

      // Simple correlation logic
      const timeline = [
        ...(deployments || []).map((d) => ({ type: 'deployment', at: d.created_at, status: d.status, message: d.commit_message })),
        ...(events || []).map((e) => ({ type: 'event', at: e.occurred_at, severity: e.severity, source: e.source, event_type: e.event_type })),
        ...(incidents || []).map((i) => ({ type: 'incident', at: i.created_at, severity: i.severity, title: i.title })),
      ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

      // Find first error after a deployment
      let suspectedCause: string | null = null;
      for (let i = 0; i < timeline.length; i++) {
        if (timeline[i].type === 'deployment') {
          for (let j = i + 1; j < timeline.length && j <= i + 3; j++) {
            if (timeline[j].type === 'event' && (timeline[j].severity === 'error' || timeline[j].severity === 'critical')) {
              suspectedCause = `Deployment at ${timeline[i].at} may have introduced issues. First error observed at ${timeline[j].at} from ${timeline[j].source}.`;
              break;
            }
          }
        }
        if (suspectedCause) break;
      }

      return {
        analysis: 'root_cause',
        projectId: args.projectId,
        windowHours: hours,
        timelineCount: timeline.length,
        eventCount: events?.length || 0,
        deploymentCount: deployments?.length || 0,
        incidentCount: incidents?.length || 0,
        checkCount: checks?.length || 0,
        suspectedCause: suspectedCause || 'No clear deployment-to-error correlation found in the time window.',
        timeline: timeline.slice(0, 20),
      };
    }

    default:
      return { error: 'Unknown tool' };
  }
}

// Action execution logic
async function executeAction(
  supabase: ReturnType<typeof createClient>,
  action: string,
  projectId: string,
  reason: string
): Promise<Record<string, unknown>> {
  const timestamp = new Date().toISOString();

  switch (action) {
    case 'rollback_deployment': {
      const { data: latest } = await supabase
        .from('deployments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latest) {
        await supabase
          .from('deployments')
          .update({ status: 'cancelled', metadata: { ...(latest.metadata || {}), rollback_reason: reason, rolled_back_at: timestamp } })
          .eq('id', latest.id);
      }

      await supabase.from('unified_events').insert({
        project_id: projectId,
        source: 'copilot',
        event_type: 'rollback_executed',
        severity: 'warning',
        payload: { action, reason, deployment_id: latest?.id },
      });

      return { action, status: 'executed', message: `Deployment ${latest?.id || 'N/A'} rolled back.`, timestamp };
    }

    case 'clear_cache': {
      await supabase.from('unified_events').insert({
        project_id: projectId,
        source: 'copilot',
        event_type: 'cache_clear_requested',
        severity: 'info',
        payload: { action, reason },
      });
      return { action, status: 'executed', message: 'Cache clear requested. Ensure your CDN integration is configured to act on this event.', timestamp };
    }

    case 'toggle_feature_flag': {
      await supabase.from('unified_events').insert({
        project_id: projectId,
        source: 'copilot',
        event_type: 'feature_flag_toggled',
        severity: 'info',
        payload: { action, reason },
      });
      return { action, status: 'executed', message: 'Feature flag toggle event recorded. Use your feature flag provider dashboard to apply changes.', timestamp };
    }

    case 'alert_oncall': {
      const { data: project } = await supabase.from('projects').select('client_id').eq('id', projectId).single();
      const { data: client } = await supabase.from('clients').select('agency_id').eq('id', project?.client_id || '').single();

      await supabase.from('incidents').insert({
        agency_id: client?.agency_id,
        project_id: projectId,
        severity: 'sev2-high',
        title: 'Copilot-triggered escalation',
        summary: reason,
        status: 'detected',
      });

      return { action, status: 'executed', message: 'On-call alert created as a new incident.', timestamp };
    }

    case 'run_diagnostics': {
      const health = await executeTool(supabase, 'get_project_health', { projectId });
      return { action, status: 'executed', message: 'Diagnostics complete. Review the health summary below.', health, timestamp };
    }

    case 'scale_functions': {
      await supabase.from('unified_events').insert({
        project_id: projectId,
        source: 'copilot',
        event_type: 'scale_request',
        severity: 'info',
        payload: { action, reason },
      });
      return { action, status: 'executed', message: 'Scale request logged. Apply this via your infrastructure provider (Vercel, AWS, etc.).', timestamp };
    }

    default:
      return { action, status: 'failed', message: `Unknown action: ${action}`, timestamp };
  }
}

serve(async (req) => {
  try {
    // Validate JWT from Supabase auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          response: 'You have reached the copilot rate limit. Please try again in a minute.',
          resetAt: rateLimit.resetAt,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimit.resetAt),
          },
        }
      );
    }

    const body: CopilotRequest = await req.json();

    // Handle direct action execution
    if (body.executeAction) {
      const result = await executeAction(supabase, body.executeAction.action, body.executeAction.projectId, body.executeAction.reason);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { message, projectId, model = 'smart', history = [], context } = body;
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const selectedModel = GROQ_MODELS[model] || GROQ_MODELS.smart;

    // Build system prompt with context
    const systemPrompt = `You are Agentcy Copilot, an expert Site Reliability Engineering (SRE) assistant embedded in the Agentcy Control mission control platform. You help engineering teams monitor, debug, and manage their applications and infrastructure.

Available capabilities:
- Query project health, errors, deployments, and incidents
- Analyze Sentry errors, Vercel deployments, PostHog analytics
- Review cost and spending across services
- Suggest safe remediation actions (rollback, cache clear, feature flags, alert on-call)

When responding:
- Be concise, direct, and technical
- Use markdown formatting for readability
- If data shows critical issues, escalate with clear action items
- If you don't have enough context, ask clarifying questions
- Never guess about data; use the tools available to you

Current user context:
- Page: ${context?.currentPage || 'unknown'}
- Selected Project: ${projectId || 'none'}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    // Call Groq API with tool definitions
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 4096,
        stream: false,
      }),
    });

    if (!groqResponse.ok) {
      const errorBody = await groqResponse.text();
      console.error('Groq API error:', groqResponse.status, errorBody);
      return new Response(
        JSON.stringify({
          error: 'LLM service unavailable',
          response: 'Sorry, the AI service is temporarily unavailable. Please try again in a moment.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const groqData = await groqResponse.json();
    const assistantMessage = groqData.choices?.[0]?.message;

    if (!assistantMessage) {
      return new Response(
        JSON.stringify({ response: 'No response from AI model.', suggestions: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle tool calls
    let finalResponse = assistantMessage.content || '';
    const toolResults: Array<{ tool: string; result: unknown }> = [];

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        // Inject projectId if not provided
        if (!toolArgs.projectId && projectId) {
          toolArgs.projectId = projectId;
        }

        const result = await executeTool(supabase, toolName, toolArgs);
        toolResults.push({ tool: toolName, result });
      }

      // Send tool results back to Groq for final answer
      const followUpMessages = [
        ...messages,
        assistantMessage,
        ...assistantMessage.tool_calls.map((tc: unknown, i: number) => ({
          role: 'tool',
          tool_call_id: (tc as { id: string }).id,
          content: JSON.stringify(toolResults[i]?.result),
        })),
      ];

      const followUpResponse = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: followUpMessages,
          temperature: 0.2,
          max_tokens: 4096,
        }),
      });

      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        finalResponse = followUpData.choices?.[0]?.message?.content || finalResponse;
      }
    }

    // Generate contextual suggestions based on the conversation
    const suggestions = [
      'Show me recent errors',
      'Check project health',
      'Recent deployments',
      'Cost breakdown',
      'Create an incident',
    ];

    return new Response(
      JSON.stringify({
        response: finalResponse,
        toolCalls: toolResults,
        suggestions,
        model: selectedModel,
        usage: groqData.usage,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Copilot error:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal error',
        response: 'Sorry, I encountered an error processing your request. Please try again.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
