// Jira integration placeholder
export class JiraClient {
  constructor(private organizationId: string) {}

  async isConnected(): Promise<boolean> {
    return false
  }

  async sync(): Promise<{ success: boolean; itemsSynced: number }> {
    return { success: true, itemsSynced: 0 }
  }

  async disconnect(): Promise<void> {}
}
