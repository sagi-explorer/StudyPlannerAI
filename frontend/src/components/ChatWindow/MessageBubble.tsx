import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '@/types';
import styles from './MessageBubble.module.css';

interface MessageBubbleProps {
  message: Message;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { role, content, created_at } = message;

  if (role === 'system') {
    return (
      <div className={`${styles.bubble} ${styles.system}`}>
        <div className={styles.systemContent}>{content}</div>
      </div>
    );
  }

  if (role === 'user') {
    return (
      <div className={`${styles.bubble} ${styles.user}`}>
        <div className={styles.userContent}>{content}</div>
        <span className={styles.timestamp}>{formatTime(created_at)}</span>
      </div>
    );
  }

  return (
    <div className={`${styles.bubble} ${styles.assistant}`}>
      <div className={styles.assistantContent}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
      <span className={styles.timestamp}>{formatTime(created_at)}</span>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className={`${styles.bubble} ${styles.assistant}`}>
      <div className={styles.typingIndicator}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </div>
  );
}
