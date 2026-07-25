import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { getApiUrl } from '../api/client';

const parseSseChunk = (block) => {
  const line = block.trim();
  if (!line.startsWith('data: ')) return null;
  try {
    return JSON.parse(line.slice(6));
  } catch {
    return null;
  }
};

const ChatPanel = ({ sessionId, authToken, initialMessages = [] }) => {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [sessionId, initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMessage, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${getApiUrl()}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ session_id: sessionId, message: trimmed }),
      });

      if (!response.ok) {
        let message = 'Failed to send message. Please try again.';
        try {
          const payload = await response.json();
          message = payload.error || message;
        } catch {
          // ignore parse errors
        }
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const payload = parseSseChunk(part);
          if (!payload) continue;

          if (payload.error) {
            throw new Error(payload.error);
          }

          if (payload.delta) {
            streamedText += payload.delta;
            setMessages((prev) => {
              const next = [...prev];
              const lastIndex = next.length - 1;
              if (lastIndex >= 0 && next[lastIndex].role === 'assistant') {
                next[lastIndex] = { role: 'assistant', content: streamedText };
              }
              return next;
            });
          }

          if (payload.done && payload.messages) {
            setMessages(payload.messages);
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to send message. Please try again.');
      setMessages((prev) => {
        const next = [...prev];
        if (next[next.length - 1]?.role === 'assistant' && !next[next.length - 1].content) {
          next.pop();
        }
        if (next[next.length - 1]?.role === 'user' && next[next.length - 1].content === trimmed) {
          next.pop();
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  const renderMessageContent = (msg, index) => {
    if (!msg.content) {
      if (loading && index === messages.length - 1) {
        return (
          <span className="inline-flex gap-1 text-slate-400">
            <span className="animate-bounce">·</span>
            <span className="animate-bounce [animation-delay:0.1s]">·</span>
            <span className="animate-bounce [animation-delay:0.2s]">·</span>
          </span>
        );
      }
      return null;
    }

    if (msg.role === 'assistant') {
      return (
        <ReactMarkdown
          className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
            li: ({ children }) => <li>{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            h1: ({ children }) => <p className="font-semibold text-slate-900 mb-1">{children}</p>,
            h2: ({ children }) => <p className="font-semibold text-slate-900 mb-1">{children}</p>,
            h3: ({ children }) => <p className="font-semibold text-slate-900 mb-1">{children}</p>,
          }}
        >
          {msg.content}
        </ReactMarkdown>
      );
    }

    return <span className="whitespace-pre-wrap">{msg.content}</span>;
  };

  return (
    <div className="mt-10 pt-8 border-t border-slate-100">
      <h3 className="text-xl font-bold text-slate-900 mb-1">Follow-up chat</h3>
      <p className="text-sm text-slate-500 mb-4">
        Ask questions about your symptoms or the assessment above.
      </p>

      <div className="h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3 mb-4">
        {messages.map((msg, index) => (
          <div
            key={`${msg.role}-${index}`}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-medilink-600 text-white rounded-br-md'
                  : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm'
              }`}
            >
              {renderMessageContent(msg, index)}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..."
          className="ml-input flex-1"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="ml-btn-primary px-6"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
