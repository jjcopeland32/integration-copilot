'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileCode, Server, TestTube, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function ProjectsPage() {
  const projects = [
    {
      id: '1',
      name: 'Stripe Payment Integration',
      status: 'ACTIVE',
      specs: 3,
      mocks: 2,
      tests: 12,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      id: '2',
      name: 'PayPal Checkout',
      status: 'ACTIVE',
      specs: 2,
      mocks: 1,
      tests: 8,
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      id: '3',
      name: 'Twilio SMS API',
      status: 'DRAFT',
      specs: 1,
      mocks: 0,
      tests: 0,
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      id: '4',
      name: 'SendGrid Email',
      status: 'ARCHIVED',
      specs: 4,
      mocks: 3,
      tests: 15,
      gradient: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-in">
        <div>
          <h1 className="text-4xl font-bold gradient-text">Projects</h1>
          <p className="text-lg text-gray-600 mt-2">
            Manage your API integration projects
          </p>
        </div>
        <Button size="lg" variant="gradient" className="gap-2">
          <Plus className="h-5 w-5" />
          New Project
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, index) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card
              className="card-hover animate-in h-full group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${project.gradient} shadow-lg group-hover:scale-110 transition-transform`}>
                    <FileCode className="h-6 w-6 text-white" />
                  </div>
                  <Badge
                    variant={
                      project.status === 'ACTIVE'
                        ? 'success'
                        : project.status === 'DRAFT'
                        ? 'warning'
                        : 'default'
                    }
                  >
                    {project.status}
                  </Badge>
                </div>
                <CardTitle className="text-xl group-hover:gradient-text transition-all">
                  {project.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50">
                    <FileCode className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                    <p className="text-2xl font-bold text-gray-900">{project.specs}</p>
                    <p className="text-xs text-gray-600">Specs</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50">
                    <Server className="h-5 w-5 mx-auto mb-1 text-green-600" />
                    <p className="text-2xl font-bold text-gray-900">{project.mocks}</p>
                    <p className="text-xs text-gray-600">Mocks</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50">
                    <TestTube className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                    <p className="text-2xl font-bold text-gray-900">{project.tests}</p>
                    <p className="text-xs text-gray-600">Tests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
