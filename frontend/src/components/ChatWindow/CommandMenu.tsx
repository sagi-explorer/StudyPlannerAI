import { useEffect, useState, useCallback } from 'react';
import styles from './CommandMenu.module.css';

export interface CommandItem {
  command: string;
  label: string;
  description: string;
}

const COMMANDS: CommandItem[] = [
  { command: '/复盘', label: '复盘', description: '生成学习/工作复盘分析' },
  { command: '/本周总结', label: '本周总结', description: '总结本周任务完成情况' },
  { command: '/调整风格', label: '调整风格', description: '调整 AI 对话严厉程度' },
  { command: '/添加任务', label: '添加任务', description: '快速添加新任务' },
];

interface CommandMenuProps {
  filter: string;
  onSelect: (command: string) => void;
  onClose: () => void;
}

export function CommandMenu({ filter, onSelect, onClose }: CommandMenuProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = COMMANDS.filter(
    (cmd) =>
      cmd.command.includes(filter) || cmd.label.includes(filter.replace('/', ''))
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [filter]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (filtered.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(filtered[activeIndex].command);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [filtered, activeIndex, onSelect, onClose],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (filtered.length === 0) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.menu}>
        <div className={styles.title}>快捷指令</div>
        {filtered.map((cmd, i) => (
          <button
            key={cmd.command}
            className={`${styles.item} ${i === activeIndex ? styles.itemActive : ''}`}
            onClick={() => onSelect(cmd.command)}
            onMouseEnter={() => setActiveIndex(i)}
          >
            <span className={styles.command}>{cmd.command}</span>
            <span className={styles.desc}>{cmd.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
