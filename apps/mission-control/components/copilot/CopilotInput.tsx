'use client';

import { Send } from 'lucide-react';

interface CopilotInputProps {
  input: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export default function CopilotInput({ input, onChange, onSubmit, isLoading }: CopilotInputProps) {
  return (
    <form onSubmit={onSubmit} className="p-3 bg-white border-t border-slate-100">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ask about projects, errors, costs, deployments..."
          className="flex-1 px-4 py-2.5 bg-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
