'use client';

import { Button } from '@agentcy/ui';
import {
  Bot,
  User,
  Loader2,
  AlertTriangle,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { formatContent } from './formatContent';
import type { Message, ProposedAction } from './types';

interface CopilotMessageProps {
  message: Message;
  onSend: (text: string) => void;
  onExecuteAction: (msgId: string, action: ProposedAction) => void;
  getProposedActions: (toolCalls?: Array<{ tool: string; result: unknown }>) => ProposedAction[];
}

export default function CopilotMessage({
  message,
  onSend,
  onExecuteAction,
  getProposedActions,
}: CopilotMessageProps) {
  const proposedActions = getProposedActions(message.toolCalls);

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-2.5 ${
          message.role === 'user'
            ? 'bg-slate-900 text-white'
            : 'bg-white border border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-1.5 mb-1">
          {message.role === 'assistant' ? (
            <Bot className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <User className="h-3.5 w-3.5 text-slate-300" />
          )}
          <span className="text-[10px] font-medium opacity-60 uppercase tracking-wider">
            {message.role === 'assistant' ? 'Copilot' : 'You'}
          </span>
          {message.model && (
            <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded ml-auto">
              {message.model}
            </span>
          )}
        </div>

        {message.isLoading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
            <span className="text-xs text-slate-400">Thinking with Groq...</span>
          </div>
        ) : (
          <div className="space-y-0.5">{formatContent(message.content)}</div>
        )}

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Tools Used</p>
            <div className="flex flex-wrap gap-1">
              {message.toolCalls.map((tc) => (
                <span
                  key={tc.tool}
                  className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                >
                  {tc.tool}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Proposed Actions */}
        {proposedActions.length > 0 && !message.executedAction && (
          <div className="mt-3 space-y-2">
            {proposedActions.map((pa) => (
              <div
                key={pa.action}
                className="rounded-lg border border-amber-200 bg-amber-50 p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-800 capitalize">
                    {pa.action.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-amber-700 mb-2">{pa.reason}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    className="text-xs py-1 px-2"
                    onClick={() => onExecuteAction(message.id, pa)}
                    isLoading={message.isLoading}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Execute
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Executed Action Result */}
        {message.executedAction && (
          <div
            className={`mt-3 rounded-lg border p-3 ${
              message.executedAction.status === 'executed'
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {message.executedAction.status === 'executed' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <span
                className={`text-xs font-semibold capitalize ${
                  message.executedAction.status === 'executed'
                    ? 'text-emerald-800'
                    : 'text-red-800'
                }`}
              >
                {message.executedAction.status}
              </span>
            </div>
            <p
              className={`text-xs ${
                message.executedAction.status === 'executed'
                  ? 'text-emerald-700'
                  : 'text-red-700'
              }`}
            >
              {message.executedAction.message}
            </p>
          </div>
        )}

        {message.suggestions && message.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onSend(suggestion)}
                className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-100"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
