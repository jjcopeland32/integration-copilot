'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, FileSignature } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Mock data
  const report = {
    id: id,
    project: 'Stripe Payment Integration',
    status: 'DRAFT',
    risk: 'LOW',
    createdAt: '2025-11-01',
    markdown: `# Production Readiness Report

**Project:** Stripe Payment Integration  
**Date:** November 1, 2025  
**Status:** Ready for Go-Live  
**Risk Level:** LOW

---

## Executive Summary

The Stripe Payment Integration has successfully completed all phases of the onboarding process and is ready for production deployment. All critical tests are passing, security requirements are met, and documentation is complete.

## Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Test Pass Rate | 95% | ✅ Pass |
| Error Rate | 0.5% | ✅ Pass |
| Average Latency | 127ms | ✅ Pass |
| Phase Completion | 100% | ✅ Complete |

## Risk Assessment

**Overall Risk: LOW**

- ✅ Test pass rate >90%
- ✅ All phases complete
- ✅ Error rate <5%
- ✅ Latency <1s
- ✅ Security review passed

## Phase Completion

### 1. Authentication ✅
- API credentials configured
- Token refresh implemented
- All auth tests passing

### 2. Core Integration ✅
- All required endpoints implemented
- Happy path tests passing (100%)
- Error handling complete

### 3. Webhooks ✅
- Webhook endpoint configured
- Signature verification working
- Event processing tested

### 4. UAT ✅
- All golden tests passing
- UAT scenarios completed
- Performance benchmarks met

### 5. Certification ✅
- Security review completed
- Documentation finalized
- Go-live checklist approved

## Recommendations

1. **Deploy to production** - All requirements met
2. **Monitor error rates** - Set up alerts for >5% error rate
3. **Track latency** - Monitor p95 latency <500ms
4. **Regular reviews** - Schedule monthly integration health checks

## Approval

This report certifies that the integration is production-ready.

---

**Generated:** November 1, 2025  
**Report ID:** ${id}
`,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/reports">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{report.project}</h1>
            <Badge variant={report.risk === 'LOW' ? 'success' : 'warning'}>
              {report.risk} Risk
            </Badge>
          </div>
          <p className="text-gray-500 mt-2">Created {report.createdAt}</p>
        </div>
        <div className="flex gap-2">
          {report.status === 'DRAFT' && (
            <Button>
              <FileSignature className="h-4 w-4 mr-2" />
              Sign Report
            </Button>
          )}
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{report.markdown}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
