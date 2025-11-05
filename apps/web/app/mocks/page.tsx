'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Play, Square, Download, Activity } from 'lucide-react';

export default function MocksPage() {
  const mocks = [
    { id: '1', name: 'Stripe API Mock', status: 'RUNNING', requests: 1234, gradient: 'from-blue-500 to-cyan-500' },
    { id: '2', name: 'PayPal Mock', status: 'STOPPED', requests: 856, gradient: 'from-purple-500 to-pink-500' },
    { id: '3', name: 'Twilio Mock', status: 'RUNNING', requests: 432, gradient: 'from-green-500 to-emerald-500' },
  ];

  return (
    <div className="space-y-8">
      <div className="animate-in">
        <h1 className="text-4xl font-bold gradient-text">Mock Services</h1>
        <p className="text-lg text-gray-600 mt-2">Manage your API mock servers</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mocks.map((mock, index) => (
          <Card key={mock.id} className="card-hover animate-in" style={{ animationDelay: `${index * 100}ms` }}>
            <CardHeader>
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${mock.gradient} shadow-lg`}>
                  <Server className="h-6 w-6 text-white" />
                </div>
                <Badge variant={mock.status === 'RUNNING' ? 'success' : 'default'}>
                  {mock.status}
                </Badge>
              </div>
              <CardTitle className="text-xl">{mock.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50">
                <Activity className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{mock.requests}</p>
                  <p className="text-xs text-gray-600">Total Requests</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={mock.status === 'RUNNING' ? 'destructive' : 'default'} className="flex-1">
                  {mock.status === 'RUNNING' ? <Square className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  {mock.status === 'RUNNING' ? 'Stop' : 'Start'}
                </Button>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
