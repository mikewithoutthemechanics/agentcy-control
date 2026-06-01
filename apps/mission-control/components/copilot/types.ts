export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  isLoading?: boolean;
  model?: string;
  toolCalls?: Array<{ tool: string; result: unknown }>;
  executedAction?: { action: string; status: string; message: string } | null;
}

export interface ProposedAction {
  action: string;
  projectId: string;
  reason: string;
}
