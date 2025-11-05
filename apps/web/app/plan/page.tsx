'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Lock, Rocket, Webhook, TestTube2, Award } from 'lucide-react';

export default function PlanPage() {
  const phases = [
    { name: 'Authentication', icon: Lock, items: 3, done: 3, gradient: 'from-blue-500 to-cyan-500' },
    { name: 'Core Integration', icon: Rocket, items: 5, done: 5, gradient: 'from-purple-500 to-pink-500' },
    { name: 'Webhooks', icon: Webhook, items: 4, done: 2, gradient: 'from-green-500 to-emerald-500' },
    { name: 'UAT', icon: TestTube2, items: 3, done: 0, gradient: 'from-orange-500 to-red-500' },
    { name: 'Certification', icon: Award, items: 2, done: 0, gradient: 'from-indigo-500 to-purple-500' },
  ];

  const totalItems = phases.reduce((sum, p) => sum + p.items, 0);
  const totalDone = phases.reduce((sum, p) => sum + p.done, 0);
  const progress = Math.round((totalDone / totalItems) * 100);

  return (
    <div className="space-y-8">
      <div className="animate-in">
        <h1 className="text-4xl font-bold gradient-text">Plan Board</h1>
        <p className="text-lg text-gray-600 mt-2">Track your 5-phase integration roadmap</p>
      </div>

      <Card className="animate-in">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall Progress</p>
              <p className="text-3xl font-bold gradient-text">{progress}%</p>
            </div>
            <Badge variant="gradient" className="text-lg px-4 py-2">
              {totalDone} / {totalItems} Complete
            </Badge>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {phases.map((phase, index) => (
          <Card key={phase.name} className="card-hover animate-in" style={{ animationDelay: `${index * 100}ms` }}>
            <CardHeader>
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${phase.gradient} shadow-lg`}>
                  <phase.icon className="h-6 w-6 text-white" />
                </div>
                <Badge variant={phase.done === phase.items ? 'success' : phase.done > 0 ? 'info' : 'default'}>
                  {phase.done}/{phase.items}
                </Badge>
              </div>
              <CardTitle className="text-xl">{phase.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: phase.items }).map((_, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${
                    i < phase.done 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50' 
                      : 'bg-gray-50'
                  }`}>
                    {i < phase.done ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : i === phase.done ? (
                      <Clock className="h-5 w-5 text-blue-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <span className={`text-sm font-medium ${i < phase.done ? 'text-gray-900' : 'text-gray-500'}`}>
                      Task {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
