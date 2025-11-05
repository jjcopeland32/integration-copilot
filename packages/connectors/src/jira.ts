import axios, { AxiosInstance } from 'axios';

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

export interface JiraIssue {
  key?: string;
  summary: string;
  description: string;
  issueType: 'Bug' | 'Task' | 'Story';
  priority?: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  labels?: string[];
}

export class JiraConnector {
  private client: AxiosInstance;

  constructor(private config: JiraConfig) {
    this.client = axios.create({
      baseURL: `${config.baseUrl}/rest/api/3`,
      auth: {
        username: config.email,
        password: config.apiToken,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async createIssue(issue: JiraIssue): Promise<string> {
    try {
      const response = await this.client.post('/issue', {
        fields: {
          project: {
            key: this.config.projectKey,
          },
          summary: issue.summary,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: issue.description,
                  },
                ],
              },
            ],
          },
          issuetype: {
            name: issue.issueType,
          },
          priority: issue.priority
            ? {
                name: issue.priority,
              }
            : undefined,
          labels: issue.labels || [],
        },
      });

      return response.data.key;
    } catch (error) {
      console.error('Failed to create Jira issue:', error);
      throw error;
    }
  }

  async createIssueFromTestFailure(
    projectName: string,
    testName: string,
    errorMessage: string,
    traceUrl?: string
  ): Promise<string> {
    let description = `Test "${testName}" failed in project "${projectName}".\n\n`;
    description += `Error:\n${errorMessage}\n\n`;
    
    if (traceUrl) {
      description += `Trace: ${traceUrl}`;
    }

    return this.createIssue({
      summary: `[Integration] Test Failure: ${testName}`,
      description,
      issueType: 'Bug',
      priority: 'High',
      labels: ['integration', 'test-failure', projectName.toLowerCase()],
    });
  }

  async createIssueFromValidationError(
    projectName: string,
    endpoint: string,
    validationErrors: string[],
    traceUrl?: string
  ): Promise<string> {
    let description = `Validation errors detected for endpoint "${endpoint}" in project "${projectName}".\n\n`;
    description += `Errors:\n`;
    
    for (const error of validationErrors) {
      description += `- ${error}\n`;
    }
    
    if (traceUrl) {
      description += `\nTrace: ${traceUrl}`;
    }

    return this.createIssue({
      summary: `[Integration] Validation Error: ${endpoint}`,
      description,
      issueType: 'Bug',
      priority: 'Medium',
      labels: ['integration', 'validation', projectName.toLowerCase()],
    });
  }

  async updateIssue(issueKey: string, updates: Partial<JiraIssue>): Promise<void> {
    try {
      const fields: any = {};

      if (updates.summary) {
        fields.summary = updates.summary;
      }

      if (updates.description) {
        fields.description = {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: updates.description,
                },
              ],
            },
          ],
        };
      }

      if (updates.priority) {
        fields.priority = { name: updates.priority };
      }

      if (updates.labels) {
        fields.labels = updates.labels;
      }

      await this.client.put(`/issue/${issueKey}`, { fields });
    } catch (error) {
      console.error('Failed to update Jira issue:', error);
      throw error;
    }
  }

  async addComment(issueKey: string, comment: string): Promise<void> {
    try {
      await this.client.post(`/issue/${issueKey}/comment`, {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: comment,
                },
              ],
            },
          ],
        },
      });
    } catch (error) {
      console.error('Failed to add Jira comment:', error);
      throw error;
    }
  }
}

export function createJiraConnector(config: JiraConfig): JiraConnector {
  return new JiraConnector(config);
}
