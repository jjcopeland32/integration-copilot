'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCode, Upload, Sparkles, Server, TestTube, CheckCircle } from 'lucide-react';

export default function SpecsPage() {
  const [importing, setImporting] = useState(false);
  const [specs, setSpecs] = useState([
    { id: '1', name: 'Stripe Payment API', type: 'OPENAPI', endpoints: 12, status: 'imported' },
    { id: '2', name: 'Todo API', type: 'OPENAPI', endpoints: 5, status: 'imported' },
  ]);
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);

  const handleLoadSamples = async () => {
    setImporting(true);
    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 1000));
    setImporting(false);
    alert('Sample specs loaded! Check the Stripe Payment API and Todo API cards.');
  };

  const handleGenerateBlueprint = async (specId: string) => {
    alert(`Generating blueprint for spec ${specId}...\n\nThis will analyze the API spec and create a detailed integration blueprint with:\n- Endpoint documentation\n- Authentication requirements\n- Data models\n- Integration steps`);
  };

  const handleGenerateMock = async (specId: string) => {
    alert(`Generating mock server for spec ${specId}...\n\nThis will create:\n- Mock API server on port 3001\n- Realistic response data\n- Latency simulation\n- Request logging`);
  };

  const handleGenerateTests = async (specId: string) => {
    alert(`Generating golden tests for spec ${specId}...\n\nThis will create 10 test categories:\n1. Authentication\n2. Idempotency\n3. Rate Limiting\n4. Error Handling\n5. Webhooks\n6. Pagination\n7. Filtering\n8. Versioning\n9. CORS\n10. Security Headers`);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-in">
        <div>
          <h1 className="text-4xl font-bold gradient-text">API Specifications</h1>
          <p className="text-lg text-gray-600 mt-2">
            Import and manage your OpenAPI/AsyncAPI specs
          </p>
        </div>
        <Button 
          size="lg" 
          variant="gradient" 
          className="gap-2"
          onClick={handleLoadSamples}
          disabled={importing}
        >
          <Upload className="h-5 w-5" />
          {importing ? 'Loading...' : 'Load Sample Specs'}
        </Button>
      </div>

      {/* Specs Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {specs.map((spec, index) => (
          <Card
            key={spec.id}
            className="card-hover animate-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader>
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                  <FileCode className="h-6 w-6 text-white" />
                </div>
                <Badge variant="success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {spec.status}
                </Badge>
              </div>
              <CardTitle className="text-xl">{spec.name}</CardTitle>
              <p className="text-sm text-gray-600">{spec.type} • {spec.endpoints} endpoints</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
                onClick={() => handleGenerateBlueprint(spec.id)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Blueprint
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateMock(spec.id)}
                >
                  <Server className="h-4 w-4 mr-1" />
                  Mock
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateTests(spec.id)}
                >
                  <TestTube className="h-4 w-4 mr-1" />
                  Tests
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instructions */}
      <Card className="animate-in" style={{ animationDelay: '300ms' }}>
        <CardHeader>
          <CardTitle className="text-xl">🚀 How to Use</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-gray-700">
            <div>
              <p className="font-semibold mb-2">1. Load Sample Specs</p>
              <p className="text-sm">Click "Load Sample Specs" to import pre-configured Stripe and Todo API specifications.</p>
            </div>
            <div>
              <p className="font-semibold mb-2">2. Generate Blueprint</p>
              <p className="text-sm">Create a detailed integration blueprint with endpoint documentation and requirements.</p>
            </div>
            <div>
              <p className="font-semibold mb-2">3. Create Mock Server</p>
              <p className="text-sm">Generate a mock API server for testing without hitting the real API.</p>
            </div>
            <div>
              <p className="font-semibold mb-2">4. Run Golden Tests</p>
              <p className="text-sm">Execute 10 comprehensive test suites covering authentication, rate limiting, webhooks, and more.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
