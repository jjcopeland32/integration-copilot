import { config } from './config';
import { createSlackConnector, createJiraConnector } from '@integration-copilot/connectors';

type SlackConnector = ReturnType<typeof createSlackConnector>;
type JiraConnector = ReturnType<typeof createJiraConnector>;

let slackConnector: SlackConnector | null = null;
let jiraConnector: JiraConnector | null = null;

function getSlackConnector(): SlackConnector | null {
  if (!config.features.slackIntegration || !config.integrations.slack?.enabled) {
    return null;
  }

  if (!slackConnector && config.integrations.slack?.webhookUrl) {
    slackConnector = createSlackConnector({
      webhookUrl: config.integrations.slack.webhookUrl,
    });
  }

  return slackConnector;
}

function getJiraConnector(): JiraConnector | null {
  if (!config.features.jiraIntegration || !config.integrations.jira?.enabled) {
    return null;
  }

  if (!jiraConnector && config.integrations.jira) {
    const { baseUrl, email, apiToken, projectKey } = config.integrations.jira;
    if (baseUrl && email && apiToken && projectKey) {
      jiraConnector = createJiraConnector({
        baseUrl,
        email,
        apiToken,
        projectKey,
      });
    }
  }

  return jiraConnector;
}

export type TestFailureNotification = {
  projectId: string;
  projectName: string;
  suiteName: string;
  testCaseName: string;
  errorMessage: string;
  traceUrl?: string;
};

export type TestSuccessNotification = {
  projectId: string;
  projectName: string;
  suiteName: string;
  passed: number;
  total: number;
};

export type PhaseCompleteNotification = {
  projectId: string;
  projectName: string;
  phase: string;
  completionRate: number;
};

export type ReportGeneratedNotification = {
  projectId: string;
  projectName: string;
  reportId: string;
  readyForProduction: boolean;
  reportUrl?: string;
};

export type EvidenceSubmittedNotification = {
  projectId: string;
  projectName: string;
  partnerName: string;
  planItemTitle: string;
  phase: string;
};

/**
 * Send notification when a test fails
 */
export async function notifyTestFailure(notification: TestFailureNotification): Promise<void> {
  const slack = getSlackConnector();
  const jira = getJiraConnector();

  const errors: Error[] = [];

  // Send Slack notification
  if (slack) {
    try {
      await slack.notifyTestFailure(
        notification.projectName,
        `${notification.suiteName} > ${notification.testCaseName}`,
        notification.errorMessage
      );
    } catch (error) {
      console.error('[notifications] Failed to send Slack test failure notification:', error);
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Create Jira issue
  if (jira) {
    try {
      const issueKey = await jira.createIssueFromTestFailure(
        notification.projectName,
        `${notification.suiteName} > ${notification.testCaseName}`,
        notification.errorMessage,
        notification.traceUrl
      );
      console.log(`[notifications] Created Jira issue ${issueKey} for test failure`);
    } catch (error) {
      console.error('[notifications] Failed to create Jira issue for test failure:', error);
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Log even if no connectors configured
  if (!slack && !jira) {
    console.log('[notifications] Test failure (no connectors configured):', {
      project: notification.projectName,
      suite: notification.suiteName,
      test: notification.testCaseName,
    });
  }
}

/**
 * Send notification when all tests in a suite pass
 */
export async function notifyTestSuccess(notification: TestSuccessNotification): Promise<void> {
  const slack = getSlackConnector();

  if (slack) {
    try {
      await slack.sendMessage({
        text: `✅ All tests passed: ${notification.suiteName}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '✅ Integration Tests Passed',
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Project:*\n${notification.projectName}`,
              },
              {
                type: 'mrkdwn',
                text: `*Suite:*\n${notification.suiteName}`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Result:* ${notification.passed}/${notification.total} tests passed`,
            },
          },
        ],
      });
    } catch (error) {
      console.error('[notifications] Failed to send Slack test success notification:', error);
    }
  }
}

/**
 * Send notification when a plan phase is completed
 */
export async function notifyPhaseComplete(notification: PhaseCompleteNotification): Promise<void> {
  const slack = getSlackConnector();

  if (slack) {
    try {
      await slack.notifyPhaseComplete(
        notification.projectName,
        notification.phase,
        notification.completionRate
      );
    } catch (error) {
      console.error('[notifications] Failed to send Slack phase completion notification:', error);
    }
  }
}

/**
 * Send notification when a readiness report is generated
 */
export async function notifyReportGenerated(notification: ReportGeneratedNotification): Promise<void> {
  const slack = getSlackConnector();

  if (slack) {
    try {
      await slack.notifyReadinessReport(
        notification.projectName,
        notification.readyForProduction,
        notification.reportUrl
      );
    } catch (error) {
      console.error('[notifications] Failed to send Slack report notification:', error);
    }
  }
}

/**
 * Send notification when a partner submits evidence
 */
export async function notifyEvidenceSubmitted(notification: EvidenceSubmittedNotification): Promise<void> {
  const slack = getSlackConnector();

  if (slack) {
    try {
      await slack.sendMessage({
        text: `📋 Partner evidence submitted: ${notification.planItemTitle}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '📋 Partner Evidence Submitted',
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Project:*\n${notification.projectName}`,
              },
              {
                type: 'mrkdwn',
                text: `*Partner:*\n${notification.partnerName}`,
              },
            ],
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Phase:*\n${notification.phase.toUpperCase()}`,
              },
              {
                type: 'mrkdwn',
                text: `*Item:*\n${notification.planItemTitle}`,
              },
            ],
          },
        ],
      });
    } catch (error) {
      console.error('[notifications] Failed to send Slack evidence notification:', error);
    }
  }
}

