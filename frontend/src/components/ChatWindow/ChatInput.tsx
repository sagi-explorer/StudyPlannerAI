import { useState, useRef, useCallback } from 'react';
import { SendOutlined } from '@ant-design/icons';
import { CommandMenu } from './CommandMenu';
import styles from './ChatInput.module.css';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommands) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValue(v);

    if (v === '/' || (v.startsWith('/') && !v.includes(' ') && v.length <= 8)) {
      setShowCommands(true);
    } else {
      setShowCommands(false);
    }

    requestAnimationFrame(adjustHeight);
  };

  const handleCommandSelect = (command: string) => {
    setShowCommands(false);
    const text = command + ' ';
    setValue(text);
    textareaRef.current?.focus();
  };

  const handleCommandClose = () => {
    setShowCommands(false);
  };

  return (
    <div className={styles.wrapper}>
      {showCommands && (
        <CommandMenu
          filter={value}
          onSelect={handleCommandSelect}
          onClose={handleCommandClose}
        />
      )}
      <div className={styles.inputRow}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="输入消息，或输入 / 查看快捷指令..."
          disabled={disabled}
          rows={1}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          title="发送"
        >
          <SendOutlined />
        </button>
      </div>
      <div className={styles.hint}>
        <span>Enter 发送 · Shift+Enter 换行</span>
        <span>/ 快捷指令</span>
      </div>
    </div>
  );
}
