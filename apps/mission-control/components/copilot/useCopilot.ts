'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@agentcy/supabase';
import type { Message, ProposedAction } from './types';

export function useCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'fast' | 'smart' | 'code'>('smart');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi! I'm your Agentcy Copilot powered by Groq (Llama 3). I can query your project health, analyze Sentry errors, review deployments, check costs, and suggest remediation actions. What would you like to know?",
      suggestions: ['Show me recent errors', 'Check project health', 'Recent deployments', 'Cost breakdown'],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isLoading) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: messageText,
      };

      const history = [...messages, userMessage]
        .filter((m) => !m.isLoading)
        .map((m) => ({ role: m.role, content: m.content } as { role: 'user' | 'assistant'; content: string }));

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      const loadingId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: loadingId, role: 'assistant', content: '', isLoading: true }]);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/copilot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            message: messageText,
            model: selectedModel,
            history,
            context: {
              currentPage: window.location.pathname,
            },
          }),
        });

        const data = await response.json();

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingId
              ? {
                  id: loadingId,
                  role: 'assistant',
                  content: data.response || 'No response received.',
                  suggestions: data.suggestions || [],
                  model: data.model,
                  toolCalls: data.toolCalls,
                }
              : msg
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingId
              ? {
                  id: loadingId,
                  role: 'assistant',
                  content: 'Sorry, I encountered an error connecting to the Groq API. Please check your API key configuration.',
                  suggestions: ['Try again', 'Check project health'],
                }
              : msg
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, selectedModel, supabase]
  );

  const handleExecuteAction = useCallback(
    async (msgId: string, action: ProposedAction) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, executedAction: undefined, isLoading: true } : m))
      );

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/copilot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            executeAction: action,
          }),
        });

        const result = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  isLoading: false,
                  executedAction: {
                    action: action.action,
                    status: result.status || 'unknown',
                    message: result.message || JSON.stringify(result),
                  },
                }
              : m
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  isLoading: false,
                  executedAction: {
                    action: action.action,
                    status: 'failed',
                    message: 'Failed to execute action. Check network or Edge Function configuration.',
                  },
                }
              : m
          )
        );
      }
    },
    [supabase]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSend(input);
    },
    [handleSend, input]
  );

  function getProposedActions(toolCalls?: Array<{ tool: string; result: unknown }>): ProposedAction[] {
    if (!toolCalls) return [];
    return toolCalls
      .filter((tc) => tc.tool === 'suggest_action')
      .map((tc) => {
        const r = tc.result as ProposedAction & { status?: string };
        if (r.status === 'proposed' || !r.status) {
          return { action: r.action, projectId: r.projectId, reason: r.reason };
        }
        return null;
      })
      .filter(Boolean) as ProposedAction[];
  }

  return {
    isOpen,
    setIsOpen,
    selectedModel,
    setSelectedModel,
    messages,
    input,
    setInput,
    isLoading,
    messagesEndRef,
    handleSend,
    handleExecuteAction,
    handleSubmit,
    getProposedActions,
  };
}
