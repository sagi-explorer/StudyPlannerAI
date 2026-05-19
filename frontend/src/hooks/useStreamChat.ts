import { useRef, useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';

const API_BASE = '/api';

interface SSEChunk {
  content: string;
  done: boolean;
  tasks_created?: TaskCreated[];
}

export interface TaskCreated {
  title: string;
  category?: string;
  due_date?: string;
  priority?: string;
  [key: string]: unknown;
}

export function useStreamChat() {
  const abortRef = useRef<AbortController | null>(null);

  const {
    currentConversationId,
    appendUserMessage,
    startStreaming,
    appendStreamChunk,
    finishStreaming,
    setStreamError,
  } = useChatStore();

  const sendMessage = useCallback(
    async (content: string): Promise<TaskCreated[]> => {
      if (!currentConversationId) {
        throw new Error('No active conversation');
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      appendUserMessage(content);
      startStreaming();

      let tasksCreated: TaskCreated[] = [];

      try {
        const response = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: currentConversationId,
            content,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const jsonStr = trimmed.slice(6);
            if (jsonStr === '[DONE]') continue;

            try {
              const chunk: SSEChunk = JSON.parse(jsonStr);

              if (chunk.content) {
                appendStreamChunk(chunk.content);
              }

              if (chunk.done) {
                if (chunk.tasks_created) {
                  tasksCreated = chunk.tasks_created;
                }
              }
            } catch {
              // skip malformed JSON lines
            }
          }
        }

        finishStreaming(tasksCreated);
        return tasksCreated;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          finishStreaming([]);
          return [];
        }
        const message = err instanceof Error ? err.message : '发送失败';
        setStreamError(message);
        throw err;
      } finally {
        abortRef.current = null;
      }
    },
    [
      currentConversationId,
      appendUserMessage,
      startStreaming,
      appendStreamChunk,
      finishStreaming,
      setStreamError,
    ],
  );

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, cancelStream };
}
