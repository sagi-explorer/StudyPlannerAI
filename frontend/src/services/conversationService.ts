import type { Conversation, Message, ConversationCreate, MessageCreate } from '@/types';
import { get, post, del } from './apiClient';

export const conversationService = {
  list(): Promise<Conversation[]> {
    return get<Conversation[]>('/conversations');
  },

  getById(id: number): Promise<Conversation> {
    return get<Conversation>(`/conversations/${id}`);
  },

  create(data?: ConversationCreate): Promise<Conversation> {
    return post<Conversation>('/conversations', data ?? {});
  },

  delete(id: number): Promise<void> {
    return del<void>(`/conversations/${id}`);
  },

  getMessages(conversationId: number): Promise<Message[]> {
    return get<Message[]>(`/conversations/${conversationId}/messages`);
  },

  sendMessage(conversationId: number, data: MessageCreate): Promise<Message> {
    return post<Message>(`/conversations/${conversationId}/messages`, data);
  },
};
