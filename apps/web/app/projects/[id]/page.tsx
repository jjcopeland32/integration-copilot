'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, Play, FileText } from 'lucide-react';
import Link from 'next/link';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Mock data - will be replaced with tRPC query
  const project = {
    id: id,
    name: 'Stripe Payment Integration',
    status: 'ACTIVE',
    createdAt: '2025-10-15',
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <Badge variant={project.status === 'ACTIVE' ? 'success' : 'default'}>
              {project.status}
            </Badge>
          </div>
          <p className="text-gray-500 mt-2">Created {project.createdAt}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <Upload className="h-8 w-8 text-blue-600 mb-2" />
            <CardTitle className="text-lg">Import Spec</CardTitle>
            <CardDescription>Upload OpenAPI or AsyncAPI specification</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <Play className="h-8 w-8 text-green-600 mb-2" />
            <CardTitle className="text-lg">Start Mock</CardTitle>
            <CardDescription>Generate and run mock API server</CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <FileText className="h-8 w-8 text-purple-600 mb-2" />
            <CardTitle className="text-lg">Generate Report</CardTitle>
            <CardDescription>Create readiness assessment report</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Specs */}
      <Card>
        <CardHeader>
          <CardTitle>Specifications</CardTitle>
          <CardDescription>OpenAPI and AsyncAPI specs for this project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No specifications yet. Import a spec to get started.
          </div>
        </CardContent>
      </Card>

      {/* Mock Services */}
      <Card>
        <CardHeader>
          <CardTitle>Mock Services</CardTitle>
          <CardDescription>Running mock API servers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No mock services running.
          </div>
        </CardContent>
      </Card>

      {/* Test Suites */}
      <Card>
        <CardHeader>
          <CardTitle>Test Suites</CardTitle>
          <CardDescription>Golden tests and validation suites</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No test suites created yet.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
