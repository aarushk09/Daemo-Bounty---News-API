import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ConversationContext {
  userId: string;
  messages: Message[];
}

// chat service handles communication with the daemo query api
export class ChatService {
  private conversations: Map<string, ConversationContext> = new Map();
  private daemoApiKey: string;
  private agentId: string;

  constructor(daemoApiKey: string, agentId: string) {
    this.daemoApiKey = daemoApiKey;
    this.agentId = agentId;
  }

  // manages user conversation state and history
  private getOrCreateConversation(userId: string): ConversationContext {
    if (!this.conversations.has(userId)) {
      this.conversations.set(userId, {
        userId,
        messages: [],
      });
    }
    return this.conversations.get(userId)!;
  }

  // sends user message to daemo and returns the agent response
  async processMessage(userId: string, userMessage: string): Promise<string> {
    const conversation = this.getOrCreateConversation(userId);
    const timestamp = new Date().toISOString();

    conversation.messages.push({
      role: 'user',
      content: userMessage,
      timestamp,
    });

    try {
      const response = await axios.post(
        `https://backend.daemo.ai/agents/${this.agentId}/query`,
        { query: userMessage },
        {
          headers: { 'Content-Type': 'application/json', 'X-API-Key': this.daemoApiKey },
          timeout: 120000
        }
      );

      const data = response.data || {};
      const assistantResponse = typeof data.response === 'string' ? data.response : (data.message || data.text || (data.data && (data.data.response || data.data.message)) || 'no response received from agent.');

      conversation.messages.push({
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date().toISOString(),
      });

      if (conversation.messages.length > 20) {
        conversation.messages = conversation.messages.slice(-20);
      }

      return assistantResponse;
    } catch (error: any) {
      console.error('daemo api error:', error.response?.data || error.message);
      return "sorry, i'm having trouble connecting to my brain right now. please try again later.";
    }
  }

  getConversationHistory(userId: string): Message[] {
    const conversation = this.getOrCreateConversation(userId);
    return conversation.messages;
  }

  clearConversation(userId: string): void {
    this.conversations.delete(userId);
  }
}
