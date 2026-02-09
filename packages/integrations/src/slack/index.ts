// Slack integration placeholder
export class SlackClient {
  constructor(private organizationId: string) {}

  async isConnected(): Promise<boolean> {
    return false
  }

  async sync(): Promise<{ success: boolean; itemsSynced: number }> {
    return { success: true, itemsSynced: 0 }
  }

  async disconnect(): Promise<void> {}

  async sendMessage(options: {
    channel: string
    text: string
    blocks?: unknown[]
  }): Promise<void> {}
}
