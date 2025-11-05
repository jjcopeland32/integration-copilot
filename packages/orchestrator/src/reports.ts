import { PrismaClient, ReportKind } from '@prisma/client';

export interface ReadinessMetrics {
  testPassRate: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageLatencyMs: number;
  errorRate: number;
  phaseCompletion: Record<string, number>;
}

export interface ReadinessRisk {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  recommendation: string;
}

export interface ReadinessReport {
  projectId: string;
  generatedAt: string;
  metrics: ReadinessMetrics;
  risks: ReadinessRisk[];
  recommendations: string[];
  readyForProduction: boolean;
  signedAt?: string;
  signedBy?: string;
}

export class ReportGenerator {
  constructor(private prisma: PrismaClient) {}

  async generateReadinessReport(projectId: string): Promise<ReadinessReport> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        suites: {
          include: {
            runs: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        traces: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        planItems: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const metrics = await this.calculateMetrics(project);
    const risks = this.identifyRisks(metrics, project);
    const recommendations = this.generateRecommendations(risks, metrics);
    const readyForProduction = this.assessReadiness(metrics, risks);

    return {
      projectId,
      generatedAt: new Date().toISOString(),
      metrics,
      risks,
      recommendations,
      readyForProduction,
    };
  }

  private async calculateMetrics(project: any): Promise<ReadinessMetrics> {
    // Calculate test metrics
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const suite of project.suites) {
      if (suite.runs.length > 0) {
        const latestRun = suite.runs[0];
        const results = latestRun.results as any;
        totalTests += results.total || 0;
        passedTests += results.passed || 0;
        failedTests += results.failed || 0;
      }
    }

    const testPassRate =
      totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    // Calculate trace metrics
    const traces = project.traces;
    const failedTraces = traces.filter((t: any) => t.verdict === 'fail').length;
    const errorRate =
      traces.length > 0 ? Math.round((failedTraces / traces.length) * 100) : 0;

    const latencies = traces
      .map((t: any) => t.responseMeta?.latencyMs || 0)
      .filter((l: number) => l > 0);
    const averageLatencyMs =
      latencies.length > 0
        ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length)
        : 0;

    // Calculate phase completion
    const phaseCompletion: Record<string, number> = {};
    const phases = ['auth', 'core', 'webhooks', 'uat', 'cert'];
    
    for (const phase of phases) {
      const phaseItems = project.planItems.filter((i: any) => i.phase === phase);
      const doneItems = phaseItems.filter((i: any) => i.status === 'DONE');
      phaseCompletion[phase] =
        phaseItems.length > 0
          ? Math.round((doneItems.length / phaseItems.length) * 100)
          : 0;
    }

    return {
      testPassRate,
      totalTests,
      passedTests,
      failedTests,
      averageLatencyMs,
      errorRate,
      phaseCompletion,
    };
  }

  private identifyRisks(
    metrics: ReadinessMetrics,
    project: any
  ): ReadinessRisk[] {
    const risks: ReadinessRisk[] = [];

    // Test coverage risk
    if (metrics.totalTests < 10) {
      risks.push({
        severity: 'high',
        category: 'Test Coverage',
        description: 'Insufficient test coverage',
        recommendation: 'Complete all 10 golden tests before going live',
      });
    }

    // Test pass rate risk
    if (metrics.testPassRate < 90) {
      risks.push({
        severity: 'critical',
        category: 'Test Quality',
        description: `Test pass rate is ${metrics.testPassRate}% (below 90% threshold)`,
        recommendation: 'Fix failing tests before production deployment',
      });
    }

    // Error rate risk
    if (metrics.errorRate > 5) {
      risks.push({
        severity: 'high',
        category: 'Error Rate',
        description: `Error rate is ${metrics.errorRate}% (above 5% threshold)`,
        recommendation: 'Investigate and resolve errors in trace logs',
      });
    }

    // Performance risk
    if (metrics.averageLatencyMs > 1000) {
      risks.push({
        severity: 'medium',
        category: 'Performance',
        description: `Average latency is ${metrics.averageLatencyMs}ms (above 1s threshold)`,
        recommendation: 'Optimize API calls and consider caching strategies',
      });
    }

    // Phase completion risks
    const criticalPhases = ['auth', 'core', 'cert'];
    for (const phase of criticalPhases) {
      if (metrics.phaseCompletion[phase] < 100) {
        risks.push({
          severity: 'critical',
          category: 'Integration Completeness',
          description: `${phase.toUpperCase()} phase is ${metrics.phaseCompletion[phase]}% complete`,
          recommendation: `Complete all ${phase} phase requirements`,
        });
      }
    }

    return risks;
  }

  private generateRecommendations(
    risks: ReadinessRisk[],
    metrics: ReadinessMetrics
  ): string[] {
    const recommendations: string[] = [];

    // Priority recommendations based on risks
    const criticalRisks = risks.filter((r) => r.severity === 'critical');
    if (criticalRisks.length > 0) {
      recommendations.push(
        '🚨 Address all critical risks before production deployment'
      );
    }

    if (metrics.testPassRate < 100) {
      recommendations.push(
        '✅ Achieve 100% test pass rate for production readiness'
      );
    }

    if (metrics.phaseCompletion.cert < 100) {
      recommendations.push(
        '📋 Complete certification checklist and obtain sign-off'
      );
    }

    if (metrics.errorRate > 0) {
      recommendations.push(
        '🔍 Review and resolve all errors in trace logs'
      );
    }

    if (metrics.averageLatencyMs > 500) {
      recommendations.push(
        '⚡ Optimize performance to reduce average latency below 500ms'
      );
    }

    // General recommendations
    recommendations.push(
      '📚 Ensure all integration documentation is up to date'
    );
    recommendations.push(
      '🔐 Complete security review and penetration testing'
    );
    recommendations.push(
      '📊 Set up monitoring and alerting for production'
    );

    return recommendations;
  }

  private assessReadiness(
    metrics: ReadinessMetrics,
    risks: ReadinessRisk[]
  ): boolean {
    // Production readiness criteria
    const hasCriticalRisks = risks.some((r) => r.severity === 'critical');
    const testPassRateOk = metrics.testPassRate >= 90;
    const errorRateOk = metrics.errorRate <= 5;
    const corePhaseComplete = metrics.phaseCompletion.core === 100;
    const certPhaseComplete = metrics.phaseCompletion.cert === 100;

    return (
      !hasCriticalRisks &&
      testPassRateOk &&
      errorRateOk &&
      corePhaseComplete &&
      certPhaseComplete
    );
  }

  async saveReport(
    projectId: string,
    report: ReadinessReport,
    url?: string
  ) {
    return this.prisma.report.create({
      data: {
        projectId,
        kind: ReportKind.READINESS,
        url,
        meta: report as any,
      },
    });
  }

  async signReport(reportId: string, signedBy: string) {
    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        signedAt: new Date(),
        meta: {
          ...((await this.prisma.report.findUnique({ where: { id: reportId } }))?.meta as any || {}),
          signedBy,
        } as any,
      },
    });
  }

  generateMarkdown(report: ReadinessReport): string {
    let md = `# Go-Live Readiness Report\n\n`;
    md += `**Project ID:** ${report.projectId}\n`;
    md += `**Generated:** ${new Date(report.generatedAt).toLocaleString()}\n`;
    md += `**Status:** ${report.readyForProduction ? '✅ READY FOR PRODUCTION' : '⚠️ NOT READY'}\n\n`;

    md += `## Executive Summary\n\n`;
    md += `This report assesses the readiness of the integration for production deployment based on test results, error rates, performance metrics, and phase completion.\n\n`;

    md += `## Metrics\n\n`;
    md += `| Metric | Value | Status |\n`;
    md += `|--------|-------|--------|\n`;
    md += `| Test Pass Rate | ${report.metrics.testPassRate}% | ${report.metrics.testPassRate >= 90 ? '✅' : '❌'} |\n`;
    md += `| Tests Passed | ${report.metrics.passedTests}/${report.metrics.totalTests} | - |\n`;
    md += `| Error Rate | ${report.metrics.errorRate}% | ${report.metrics.errorRate <= 5 ? '✅' : '❌'} |\n`;
    md += `| Avg Latency | ${report.metrics.averageLatencyMs}ms | ${report.metrics.averageLatencyMs <= 1000 ? '✅' : '⚠️'} |\n\n`;

    md += `## Phase Completion\n\n`;
    md += `| Phase | Completion |\n`;
    md += `|-------|------------|\n`;
    for (const [phase, completion] of Object.entries(report.metrics.phaseCompletion)) {
      md += `| ${phase.toUpperCase()} | ${completion}% ${completion === 100 ? '✅' : '⏳'} |\n`;
    }
    md += `\n`;

    if (report.risks.length > 0) {
      md += `## Risks\n\n`;
      const risksBySeverity = {
        critical: report.risks.filter((r) => r.severity === 'critical'),
        high: report.risks.filter((r) => r.severity === 'high'),
        medium: report.risks.filter((r) => r.severity === 'medium'),
        low: report.risks.filter((r) => r.severity === 'low'),
      };

      for (const [severity, risks] of Object.entries(risksBySeverity)) {
        if (risks.length > 0) {
          md += `### ${severity.toUpperCase()} Severity\n\n`;
          for (const risk of risks) {
            md += `**${risk.category}**\n\n`;
            md += `${risk.description}\n\n`;
            md += `*Recommendation:* ${risk.recommendation}\n\n`;
          }
        }
      }
    }

    md += `## Recommendations\n\n`;
    for (const rec of report.recommendations) {
      md += `- ${rec}\n`;
    }
    md += `\n`;

    if (report.signedAt && report.signedBy) {
      md += `## Approval\n\n`;
      md += `**Signed by:** ${report.signedBy}\n`;
      md += `**Date:** ${new Date(report.signedAt).toLocaleString()}\n`;
    }

    return md;
  }
}

export function createReportGenerator(prisma: PrismaClient): ReportGenerator {
  return new ReportGenerator(prisma);
}
