import { useEffect, useRef, useState, useCallback } from 'react';
import {
  PlusOutlined,
  UnorderedListOutlined,
  ArrowLeftOutlined,
  DeleteOutlined,
  MessageOutlined,
  ExclamationCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '@/stores/chatStore';
import { settingService } from '@/services/settingService';
import { MessageBubble, TypingIndicator } from './MessageBubble';
import { ActionCard, type TaskAction, type ActionType } from './ActionCard';
import { PostponeCard } from './PostponeCard';
import { ChatInput } from './ChatInput';
import type { PostponeAnalysis } from '@/types';
import styles from './index.module.css';

interface TaskCreated {
  title: string;
  category?: string;
  due_date?: string;
  priority?: string;
}

function parseTaskActions(metadata: Record<string, unknown> | null): TaskAction | null {
  if (!metadata) return null;
  const created = metadata.tasks_created as TaskCreated[] | undefined;
  if (!created || created.length === 0) return null;

  const type: ActionType = (metadata.action_type as ActionType) ?? 'add';
  return {
    type,
    tasks: created.map((t) => ({
      title: t.title,
      category: t.category,
      due_date: t.due_date,
      priority: t.priority,
    })),
  };
}

function parsePostponeAnalysis(metadata: Record<string, unknown> | null): PostponeAnalysis | null {
  if (!metadata) return null;
  const analysis = metadata.postpone_analysis as PostponeAnalysis | undefined;
  if (!analysis || !analysis.task_id) return null;
  return analysis;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return '今天';
  }
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export function ChatWindow() {
  const {
    conversations,
    currentConversationId,
    messages,
    isStreaming,
    streamContent,
    streamError,
    pendingActions,
    fetchConversations,
    selectConversation,
    createConversation,
    clearPendingActions,
    deleteConversation,
  } = useChatStore();

  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetchConversations();
    settingService.getApiKeyStatus().then((s) => setApiKeyConfigured(s.configured)).catch(() => {});
  }, [fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamContent, isStreaming]);

  const handleSend = useCallback(
    async (content: string) => {
      let convId = currentConversationId;
      if (!convId) {
        try {
          const conv = await createConversation();
          convId = conv.id;
        } catch {
          return;
        }
      }

      const { appendUserMessage, startStreaming, appendStreamChunk, finishStreaming, setStreamError } = useChatStore.getState();
      appendUserMessage(content);
      startStreaming();

      try {
        const controller = new AbortController();
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: convId, content }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';
        let tasksCreated: TaskCreated[] = [];
        let streamFinished = false;

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
              const chunk = JSON.parse(jsonStr);
              if (chunk.content) {
                appendStreamChunk(chunk.content);
              } else if (chunk.stream_end && !streamFinished) {
                streamFinished = true;
                finishStreaming([]);
              }
              if (chunk.error) setStreamError(chunk.error);
              if (chunk.tasks_created) {
                tasksCreated = chunk.tasks_created;
                useChatStore.getState().setPendingTasks(tasksCreated);
              }
              if (chunk.strictness_updated != null) {
                window.dispatchEvent(new CustomEvent('settings-changed'));
              }
            } catch {
              // skip malformed line
            }
          }
        }

        if (!streamFinished) {
          finishStreaming(tasksCreated);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          const msg = err instanceof Error ? err.message : '发送失败';
          setStreamError(msg);
        }
      }
    },
    [currentConversationId, createConversation],
  );

  const handleConfirmAction = useCallback(
    async (_action: TaskAction) => {
      clearPendingActions();
    },
    [clearPendingActions],
  );

  const handleCancelAction = useCallback(() => {
    clearPendingActions();
  }, [clearPendingActions]);

  const handleNewConversation = useCallback(async () => {
    await createConversation();
    setShowSidebar(false);
  }, [createConversation]);

  const handleSelectConversation = useCallback(
    async (id: number) => {
      await selectConversation(id);
      setShowSidebar(false);
    },
    [selectConversation],
  );

  const handleDeleteConversation = useCallback(
    async (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      await deleteConversation(id);
    },
    [deleteConversation],
  );

  const currentConv = conversations.find((c) => c.id === currentConversationId);

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.titleArea}>
          <span className={styles.title}>
            {currentConv?.title ?? 'AI 助手'}
          </span>
        </div>
        <div className={styles.topActions}>
          <button
            className={styles.iconBtn}
            onClick={handleNewConversation}
            title="新建会话"
          >
            <PlusOutlined />
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => setShowSidebar(true)}
            title="会话列表"
          >
            <UnorderedListOutlined />
          </button>
        </div>
      </div>

      <div className={styles.messageList}>
        {messages.length === 0 && !isStreaming ? (
          <div className={styles.empty}>
            <MessageOutlined className={styles.emptyIcon} />
            <div className={styles.emptyTitle}>开始对话</div>
            <div className={styles.emptyHint}>
              输入自然语言来管理任务，例如：
              <br />
              "明天下午前完成论文初稿，优先级高"
              <br />
              或输入 / 查看快捷指令
            </div>
            {apiKeyConfigured === false && (
              <button
                className={styles.errorBar}
                style={{ marginTop: 16, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => navigate('/settings')}
              >
                <SettingOutlined />
                AI 功能需要先配置 API Key，点击前往设置
              </button>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const action = parseTaskActions(msg.metadata);
              const postponeAnalysis = parsePostponeAnalysis(msg.metadata);
              return (
                <div key={msg.id}>
                  <MessageBubble message={msg} />
                  {action && (
                    <ActionCard
                      action={action}
                      onConfirm={handleConfirmAction}
                      onCancel={handleCancelAction}
                    />
                  )}
                  {postponeAnalysis && (
                    <PostponeCard
                      analysis={postponeAnalysis}
                      onPostponed={handleCancelAction}
                      onCancel={handleCancelAction}
                    />
                  )}
                </div>
              );
            })}
          </>
        )}

        {isStreaming && streamContent && (
          <div className={styles.streamBubble}>
            <div className={styles.streamContent}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamContent}</ReactMarkdown>
            </div>
          </div>
        )}

        {isStreaming && !streamContent && <TypingIndicator />}

        {streamError && (
          <div className={styles.errorBar}>
            <ExclamationCircleOutlined />
            {streamError}
          </div>
        )}

        {pendingActions.length > 0 && !messages.some((m) => m.metadata?.tasks_created) && (
          <ActionCard
            action={{ type: 'add', tasks: pendingActions }}
            onConfirm={handleConfirmAction}
            onCancel={handleCancelAction}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSend={handleSend} disabled={isStreaming} />

      {showSidebar && (
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>会话列表</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className={styles.iconBtn} onClick={handleNewConversation} title="新建会话">
                <PlusOutlined />
              </button>
              <button className={styles.iconBtn} onClick={() => setShowSidebar(false)} title="返回">
                <ArrowLeftOutlined />
              </button>
            </div>
          </div>
          <div className={styles.convList}>
            {conversations.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyHint}>暂无会话记录</div>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`${styles.convItem} ${conv.id === currentConversationId ? styles.convItemActive : ''}`}
                  onClick={() => handleSelectConversation(conv.id)}
                  role="button"
                  tabIndex={0}
                >
                  <span className={styles.convItemText}>{conv.title || '新会话'}</span>
                  <span className={styles.convItemTime}>{formatDate(conv.updated_at)}</span>
                  <button
                    className={styles.convDeleteBtn}
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    title="删除会话"
                    type="button"
                  >
                    <DeleteOutlined />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
