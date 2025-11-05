import axios from 'axios';

export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
}

export interface SlackMessage {
  text: string;
  blocks?: any[];
  attachments?: any[];
}

export class SlackConnector {
  constructor(private config: SlackConfig) {}

  async sendMessage(message: string | SlackMessage): Promise<void> {
    const payload =
      typeof message === 'string'
        ? { text: message }
        : message;

    if (this.config.channel) {
      (payload as any).channel = this.config.channel;
    }

    if (this.config.username) {
      (payload as any).username = this.config.username;
    }

    try {
      await axios.post(this.config.webhookUrl, payload);
    } catch (error) {
      console.error('Failed to send Slack message:', error);
      throw error;
    }
  }

  async notifyTestFailure(
    projectName: string,
    testName: string,
    errorMessage: string
  ): Promise<void> {
    const message: SlackMessage = {
      text: `❌ Test Failed: ${testName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '❌ Integration Test Failed',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Project:*\n${projectName}`,
            },
            {
              type: 'mrkdwn',
              text: `*Test:*\n${testName}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Error:*\n\`\`\`${errorMessage}\`\`\``,
          },
        },
      ],
    };

    await this.sendMessage(message);
  }

  async notifyPhaseComplete(
    projectName: string,
    phase: string,
    completionRate: number
  ): Promise<void> {
    const message: SlackMessage = {
      text: `✅ Phase Complete: ${phase}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '✅ Integration Phase Complete',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Project:*\n${projectName}`,
            },
            {
              type: 'mrkdwn',
              text: `*Phase:*\n${phase.toUpperCase()}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Completion:* ${completionRate}%`,
          },
        },
      ],
    };

    await this.sendMessage(message);
  }

  async notifyReadinessReport(
    projectName: string,
    readyForProduction: boolean,
    reportUrl?: string
  ): Promise<void> {
    const emoji = readyForProduction ? '🚀' : '⚠️';
    const status = readyForProduction ? 'READY FOR PRODUCTION' : 'NOT READY';

    const message: SlackMessage = {
      text: `${emoji} Readiness Report: ${status}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} Go-Live Readiness Report`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Project:*\n${projectName}`,
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\n${status}`,
            },
          ],
        },
      ],
    };

    if (reportUrl) {
      message.blocks!.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Report',
            },
            url: reportUrl,
          },
        ],
      });
    }

    await this.sendMessage(message);
  }
}

export function createSlackConnector(config: SlackConfig): SlackConnector {
  return new SlackConnector(config);
}
