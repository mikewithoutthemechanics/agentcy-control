'use client';

import { Sparkles, X, Bot } from 'lucide-react';
import { useCopilot } from './copilot/useCopilot';
import CopilotMessage from './copilot/CopilotMessage';
import CopilotInput from './copilot/CopilotInput';
import CopilotModelSelector from './copilot/CopilotModelSelector';

export default function Copilot() {
  const {
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
  } = useCopilot();

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[440px] h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-semibold text-sm">Agentcy Copilot</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full text-white/80">
                Groq
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <CopilotModelSelector
            selectedModel={selectedModel}
            onSelect={setSelectedModel}
          />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((message) => (
              <CopilotMessage
                key={message.id}
                message={message}
                onSend={handleSend}
                onExecuteAction={handleExecuteAction}
                getProposedActions={getProposedActions}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <CopilotInput
            input={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      )}
    </>
  );
}
