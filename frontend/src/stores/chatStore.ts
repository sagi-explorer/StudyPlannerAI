import { create } from 'zustand';
import type { Conversation, Message } from '@/types';
import { conversationService } from '@/services/conversationService';
import type { TaskCreated } from '@/hooks/useStreamChat';

interface ChatState {
  conversations: Conversation[];
  currentConversationId: number | null;
  messages: Message[];
  sending: boolean;

  isStreaming: boolean;
  streamContent: string;
  streamError: string | null;
  pendingActions: TaskCreated[];

  fetchConversations: () => Promise<void>;
  selectConversation: (id: number) => Promise<void>;
  createConversation: () => Promise<Conversation>;

  appendUserMessage: (content: string) => void;
  startStreaming: () => void;
  appendStreamChunk: (chunk: string) => void;
  finishStreaming: (tasksCreated: TaskCreated[]) => void;
  setStreamError: (error: string) => void;
  setPendingTasks: (tasks: TaskCreated[]) => void;
  clearPendingActions: () => void;

  deleteConversation: (id: number) => Promise<void>;
}

let tempIdCounter = -1;

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  sending: false,

  isStreaming: false,
  streamContent: '',
  streamError: null,
  pendingActions: [],

  fetchConversations: async () => {
    try {
      const conversations = await conversationService.list();
      set({ conversations });
    } catch {
      set({ streamError: '加载会话列表失败，请检查后端是否启动' });
    }
  },

  selectConversation: async (id) => {
    set({ currentConversationId: id, messages: [], streamContent: '', streamError: null });
    try {
      const messages = await conversationService.getMessages(id);
      set({ messages });
    } catch {
      set({ streamError: '加载消息失败' });
    }
  },

  createConversation: async () => {
    try {
      const conv = await conversationService.create();
      set({
        conversations: [conv, ...get().conversations],
        currentConversationId: conv.id,
        messages: [],
        streamContent: '',
        streamError: null,
      });
      return conv;
    } catch (e) {
      set({ streamError: '创建会话失败，请检查后端是否启动' });
      throw e;
    }
  },

  appendUserMessage: (content) => {
    const { currentConversationId, messages } = get();
    const userMsg: Message = {
      id: tempIdCounter--,
      conversation_id: currentConversationId ?? 0,
      role: 'user',
      content,
      metadata: null,
      created_at: new Date().toISOString(),
    };
    set({ messages: [...messages, userMsg], sending: true, streamError: null });
  },

  startStreaming: () => {
    set({ isStreaming: true, streamContent: '', streamError: null });
  },

  appendStreamChunk: (chunk) => {
    set((s) => ({ streamContent: s.streamContent + chunk }));
  },

  finishStreaming: (tasksCreated) => {
    const { messages, streamContent, currentConversationId } = get();

    if (streamContent) {
      const assistantMsg: Message = {
        id: tempIdCounter--,
        conversation_id: currentConversationId ?? 0,
        role: 'assistant',
        content: streamContent,
        metadata: tasksCreated.length > 0 ? { tasks_created: tasksCreated } : null,
        created_at: new Date().toISOString(),
      };
      set({
        messages: [...messages, assistantMsg],
        isStreaming: false,
        streamContent: '',
        sending: false,
        pendingActions: tasksCreated,
      });
    } else {
      set({ isStreaming: false, streamContent: '', sending: false });
    }
  },

  setStreamError: (error) => {
    set({ streamError: error, isStreaming: false, sending: false, streamContent: '' });
  },

  setPendingTasks: (tasks) => {
    const { messages } = get();
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.metadata?.tasks_created) {
      const updated = { ...lastMsg, metadata: { ...lastMsg.metadata, tasks_created: tasks } };
      set({
        messages: [...messages.slice(0, -1), updated],
        pendingActions: tasks,
      });
    } else {
      set({ pendingActions: tasks });
    }
  },

  clearPendingActions: () => {
    set({ pendingActions: [] });
  },

  deleteConversation: async (id) => {
    try {
      await conversationService.delete(id);
      const { conversations, currentConversationId } = get();
      const updated = conversations.filter((c) => c.id !== id);
      set({
        conversations: updated,
        ...(currentConversationId === id
          ? { currentConversationId: null, messages: [] }
          : {}),
      });
    } catch {
      set({ streamError: '删除会话失败' });
    }
  },
}));
