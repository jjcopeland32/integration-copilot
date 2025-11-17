'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BotMessageSquare, Sparkles } from 'lucide-react';

type Message = {
  role: 'system' | 'assistant' | 'user';
  text: string;
};

const seedMessages: Message[] = [
  {
    role: 'assistant',
    text: 'Hi! I monitor your latest tests, plan milestones, and traces. Ask me about blockers or next steps.',
  },
  {
    role: 'assistant',
    text: 'Tip: Upload sandbox traces to accelerate Auth + Core readiness sign-off.',
  },
];

export function PartnerAssistantPanel() {
  const [messages, setMessages] = useState<Message[]>(seedMessages);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;

    const question: Message = { role: 'user', text: input.trim() };
    setMessages((prev) => [...prev, question]);
    setInput('');
    setIsSending(true);

    // Placeholder response – future integration will call AI service.
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            'Thanks! I will analyze your most recent runs. Full AI assistance is coming next sprint.',
        },
      ]);
      setIsSending(false);
    }, 1200);
  };

  return (
    <Card className="border-white/10 bg-white/5 text-slate-50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <BotMessageSquare className="h-5 w-5 text-pink-300" />
          AI Assistant
        </CardTitle>
        <p className="text-sm text-slate-300">
          Ask questions about failures, plan tasks, or readiness — responses will soon include live data.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-64 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === 'user'
                  ? 'text-right'
                  : 'text-left text-slate-200'
              }
            >
              <div
                className={`inline-flex max-w-full rounded-2xl px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                    : 'bg-white/10 text-slate-200'
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
          {isSending && (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-xs text-slate-300">
              <Sparkles className="h-4 w-4 animate-spin" />
              Composing response...
            </div>
          )}
        </div>
        <form className="flex gap-3" onSubmit={handleSend}>
          <input
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            placeholder="Ask about a failure, evidence, or status"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <Button type="submit" variant="gradient" disabled={isSending || !input.trim()}>
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
