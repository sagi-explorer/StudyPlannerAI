export type MessageRole = 'user' | 'assistant' | 'system';

export interface Conversation {
  id: number;
  title: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: MessageRole;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ConversationCreate {
  title?: string;
}

export interface MessageCreate {
  content: string;
}
