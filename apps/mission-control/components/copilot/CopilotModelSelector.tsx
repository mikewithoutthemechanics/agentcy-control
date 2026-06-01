'use client';

import { Zap, Sparkles, Cpu } from 'lucide-react';

const MODELS = [
  { key: 'fast' as const, label: 'Fast', icon: Zap, desc: 'Llama 3 8B' },
  { key: 'smart' as const, label: 'Smart', icon: Sparkles, desc: 'Llama 3 70B' },
  { key: 'code' as const, label: 'Code', icon: Cpu, desc: 'Mixtral' },
];

interface CopilotModelSelectorProps {
  selectedModel: 'fast' | 'smart' | 'code';
  onSelect: (model: 'fast' | 'smart' | 'code') => void;
}

export default function CopilotModelSelector({ selectedModel, onSelect }: CopilotModelSelectorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
        Model
      </span>
      {MODELS.map((m) => (
        <button
          key={m.key}
          onClick={() => onSelect(m.key)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
            selectedModel === m.key
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
          title={m.desc}
        >
          <m.icon className="h-3 w-3" />
          {m.label}
        </button>
      ))}
    </div>
  );
}
