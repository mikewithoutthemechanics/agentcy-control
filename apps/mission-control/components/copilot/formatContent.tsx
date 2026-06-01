'use client';

import React from 'react';

export function formatContent(content: string): React.ReactNode[] {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let inList = false;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(<ul key={`list-${elements.length}`} className="list-disc ml-5 space-y-1 my-2">{listItems}</ul>);
      listItems = [];
    }
    inList = false;
  };

  const renderInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    let nextMatch: { type: 'bold' | 'code'; index: number; end: number; content: string } | null = null;

    while (remaining.length > 0) {
      nextMatch = null;
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const codeMatch = remaining.match(/`(.+?)`/);

      if (boldMatch && boldMatch.index !== undefined) {
        nextMatch = { type: 'bold', index: boldMatch.index, end: boldMatch.index + boldMatch[0].length, content: boldMatch[1] };
      }
      if (codeMatch && codeMatch.index !== undefined) {
        if (!nextMatch || codeMatch.index < nextMatch.index) {
          nextMatch = { type: 'code', index: codeMatch.index, end: codeMatch.index + codeMatch[0].length, content: codeMatch[1] };
        }
      }

      if (!nextMatch) {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }

      if (nextMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, nextMatch.index)}</span>);
      }

      if (nextMatch.type === 'bold') {
        parts.push(<strong key={key++} className="font-semibold text-slate-900">{nextMatch.content}</strong>);
      } else {
        parts.push(<code key={key++} className="bg-slate-100 px-1 rounded text-xs font-mono">{nextMatch.content}</code>);
      }

      remaining = remaining.slice(nextMatch.end);
    }

    return parts;
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={i} className="font-bold text-slate-900 mt-4 mb-2 text-sm">{trimmed.replace('### ', '')}</h3>);
    } else if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={i} className="font-bold text-slate-900 mt-4 mb-2">{trimmed.replace('## ', '')}</h2>);
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.includes(' - ')) {
      flushList();
      elements.push(<h3 key={i} className="font-bold text-slate-900 mt-3 mb-1 text-sm">{trimmed.replace(/\*\*/g, '')}</h3>);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      listItems.push(<li key={i} className="text-sm text-slate-700">{renderInline(trimmed.slice(2))}</li>);
    } else if (trimmed.match(/^\d+\./)) {
      inList = true;
      listItems.push(<li key={i} className="text-sm text-slate-700">{renderInline(trimmed.replace(/^\d+\.\s*/, ''))}</li>);
    } else if (trimmed.startsWith('```')) {
      flushList();
    } else if (trimmed) {
      flushList();
      elements.push(<p key={i} className="text-sm text-slate-700 mb-1">{renderInline(trimmed)}</p>);
    } else if (inList) {
      flushList();
    }
  });

  flushList();
  return elements;
}
