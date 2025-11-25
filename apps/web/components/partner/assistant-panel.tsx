'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BotMessageSquare, Sparkles, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { partnerTrpc } from '@/lib/trpc/partner/client';

type Message = {
  role: 'system' | 'assistant' | 'user';
  text: string;
};

export function PartnerAssistantPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const contextQuery = partnerTrpc.assistant.getContext.useQuery(undefined, {
    staleTime: 60_000,
  });

  const summarizeMutation = partnerTrpc.assistant.summarize.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.response },
      ]);
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Sorry, I couldn't process that request: ${error.message}`,
        },
      ]);
    },
  });

  // Initialize with context-aware greeting
  useEffect(() => {
    if (contextQuery.data && messages.length === 0) {
      const ctx = contextQuery.data;
      const greetingLines: string[] = [
        `Hi! I'm your integration assistant for ${ctx.projectName}.`,
      ];

      if (ctx.stats.totalTests > 0) {
        greetingLines.push(
          `Your test pass rate is ${ctx.stats.passRate}% (${ctx.stats.totalPassed}/${ctx.stats.totalTests}).`
        );
      }

      if (ctx.stats.planTotal > 0) {
        greetingLines.push(
          `Plan progress: ${ctx.stats.planProgress}% complete.`
        );
      }

      if (ctx.nextActions.length > 0) {
        greetingLines.push('', 'Try asking: "What should I do next?" or "Why are my tests failing?"');
      }

      setMessages([{ role: 'assistant', text: greetingLines.join('\n') }]);
    }
  }, [contextQuery.data, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || summarizeMutation.isPending) return;

    const question: Message = { role: 'user', text: input.trim() };
    setMessages((prev) => [...prev, question]);
    setInput('');

    summarizeMutation.mutate({ question: input.trim() });
  };

  const handleQuickAction = (question: string) => {
    if (summarizeMutation.isPending) return;
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    summarizeMutation.mutate({ question });
  };

  const ctx = contextQuery.data;

  return (
    <Card className="border-white/10 bg-white/5 text-slate-50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <BotMessageSquare className="h-5 w-5 text-pink-300" />
          AI Assistant
        </CardTitle>
        <p className="text-sm text-slate-300">
          Ask questions about tests, plan progress, failures, or next steps.
        </p>
        {ctx && (
          <div className="flex flex-wrap gap-2 mt-3">
            {ctx.stats.passRate >= 90 ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                {ctx.stats.passRate}% Pass Rate
              </Badge>
            ) : ctx.stats.totalTests > 0 ? (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {ctx.stats.passRate}% Pass Rate
              </Badge>
            ) : null}
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              {ctx.stats.planProgress}% Plan Complete
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-72 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          {contextQuery.isLoading && messages.length === 0 && (
            <div className="flex items-center gap-2 text-slate-400">
              <Sparkles className="h-4 w-4 animate-spin" />
              Loading your integration context...
            </div>
          )}
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
                className={`inline-block max-w-[85%] rounded-2xl px-4 py-2 text-left whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                    : 'bg-white/10 text-slate-200'
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
          {summarizeMutation.isPending && (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-xs text-slate-300">
              <Sparkles className="h-4 w-4 animate-spin" />
              Analyzing your integration data...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-white/20 hover:bg-white/10"
            onClick={() => handleQuickAction('What should I do next?')}
            disabled={summarizeMutation.isPending}
          >
            Next Steps
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-white/20 hover:bg-white/10"
            onClick={() => handleQuickAction('Why are my tests failing?')}
            disabled={summarizeMutation.isPending}
          >
            Debug Failures
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-white/20 hover:bg-white/10"
            onClick={() => handleQuickAction('Am I ready for certification?')}
            disabled={summarizeMutation.isPending}
          >
            Certification Status
          </Button>
        </div>

        <form className="flex gap-3" onSubmit={handleSend}>
          <input
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            placeholder="Ask about tests, plan, or next steps..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <Button
            type="submit"
            variant="gradient"
            disabled={summarizeMutation.isPending || !input.trim()}
          >
            {summarizeMutation.isPending ? 'Thinking...' : 'Send'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
