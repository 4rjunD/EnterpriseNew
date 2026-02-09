// Notion integration placeholder
export class NotionClient {
  constructor(private organizationId: string) {}

  async isConnected(): Promise<boolean> {
    return false
  }

  async sync(): Promise<{ success: boolean; itemsSynced: number }> {
    return { success: true, itemsSynced: 0 }
  }

  async disconnect(): Promise<void> {}

  async createPage(options: {
    parentId: string
    title: string
    content: string
  }): Promise<string> {
    return ''
  }
}
