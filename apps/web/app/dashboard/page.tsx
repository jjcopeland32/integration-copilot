'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCode, Server, TestTube, Activity, TrendingUp, Clock, CheckCircle2, Zap } from 'lucide-react';
import { useProjectContext } from '@/components/project-context';

export default function DashboardPage() {
  const { projectId, projectName } = useProjectContext();

  if (!projectId) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-12 text-center shadow-inner">
        <h2 className="text-2xl font-semibold text-gray-900">Select a project to view the dashboard</h2>
        <p className="mt-2 text-sm text-gray-600">Choose a project in the Projects view to focus the dashboard, specs, mocks, tests, and traces.</p>
        <Link href="/projects" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg">
          Go to Projects
        </Link>
      </div>
    );
  }

  const stats = [
    {
      title: 'Active Projects',
      value: '12',
      change: '+3 this month',
      icon: FileCode,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      title: 'Mock Services',
      value: '8',
      change: '2 running',
      icon: Server,
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50 to-emerald-50',
    },
    {
      title: 'Test Suites',
      value: '45',
      change: '98% pass rate',
      icon: TestTube,
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50',
    },
    {
      title: 'Traces Today',
      value: '1,234',
      change: '+12% vs yesterday',
      icon: Activity,
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-50 to-red-50',
    },
  ];

  const recentActivity = [
    {
      project: 'Stripe Payment Integration',
      action: 'Mock service started',
      time: '2 minutes ago',
      icon: Server,
      status: 'success',
    },
    {
      project: 'PayPal Checkout',
      action: 'Test suite completed',
      time: '15 minutes ago',
      icon: CheckCircle2,
      status: 'success',
    },
    {
      project: 'Twilio SMS API',
      action: 'Spec imported',
      time: '1 hour ago',
      icon: Zap,
      status: 'info',
    },
    {
      project: 'Shopify Orders',
      action: 'Blueprint generated',
      time: '2 hours ago',
      icon: FileCode,
      status: 'info',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-in">
        <h1 className="text-4xl font-bold gradient-text mb-2">
          {projectName ? `${projectName} overview` : 'Welcome back! 👋'}
        </h1>
        <p className="text-lg text-gray-600">
          Here's what's happening with your selected integration today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card
            key={stat.title}
            className="card-hover animate-in group"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.bgGradient} group-hover:scale-110 transition-transform duration-300`}>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500 mt-2">{stat.change}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity Feed */}
        <Card className="animate-in" style={{ animationDelay: '400ms' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl">Recent Activity</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-blue-50 hover:shadow-md transition-all duration-300 group"
                >
                  <div className={`p-2 rounded-lg ${
                    activity.status === 'success' 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                      : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                  } group-hover:scale-110 transition-transform`}>
                    <activity.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{activity.project}</p>
                    <p className="text-sm text-gray-600">{activity.action}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="animate-in" style={{ animationDelay: '500ms' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl">Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Import New Spec', gradient: 'from-blue-500 to-cyan-500', icon: FileCode },
                { label: 'Start Mock Service', gradient: 'from-green-500 to-emerald-500', icon: Server },
                { label: 'Run Test Suite', gradient: 'from-purple-500 to-pink-500', icon: TestTube },
                { label: 'View Traces', gradient: 'from-orange-500 to-red-500', icon: Activity },
              ].map((action, index) => (
                <button
                  key={action.label}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r ${action.gradient} text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group`}
                >
                  <div className="p-2 rounded-lg bg-white/20 group-hover:bg-white/30 transition-colors">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="font-semibold">{action.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Health */}
      <Card className="animate-in" style={{ animationDelay: '600ms' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl">Integration Health</CardTitle>
            </div>
            <Badge variant="success">All Systems Operational</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: 'API Uptime', value: '99.9%', color: 'from-green-500 to-emerald-500' },
              { label: 'Avg Response Time', value: '127ms', color: 'from-blue-500 to-cyan-500' },
              { label: 'Error Rate', value: '0.1%', color: 'from-purple-500 to-pink-500' },
            ].map((metric) => (
              <div key={metric.label} className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-blue-50">
                <p className="text-sm font-medium text-gray-600 mb-2">{metric.label}</p>
                <p className={`text-2xl font-bold bg-gradient-to-r ${metric.color} bg-clip-text text-transparent`}>
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
