import { useState, useEffect } from 'react';
import { Modal, Input, Select, DatePicker, Button, Popconfirm, message } from 'antd';
import { DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Task, TaskStatus, TaskPriority, TaskUpdate } from '@/types';
import styles from './TaskDetailModal.module.css';

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: '待办' },
  { value: 'in_progress', label: '进行中' },
  { value: 'done', label: '已完成' },
  { value: 'overdue', label: '已逾期' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'urgent', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: number, data: TaskUpdate) => Promise<void>;
  onStatusChange: (id: number, status: TaskStatus) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function TaskDetailModal({ task, open, onClose, onUpdate, onStatusChange, onDelete }: TaskDetailModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState<dayjs.Dayjs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.due_date ? dayjs(task.due_date) : null);
    }
  }, [task]);

  if (!task) return null;

  const handleSave = async () => {
    if (!title.trim()) {
      message.warning('标题不能为空');
      return;
    }
    setSaving(true);
    try {
      await onUpdate(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate ? dueDate.format('YYYY-MM-DD') : null,
      });
      if (status !== task.status) {
        await onStatusChange(task.id, status);
      }
      message.success('已保存');
      onClose();
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(task.id);
      message.success('已删除');
      onClose();
    } catch {
      message.error('删除失败');
    }
  };

  return (
    <Modal
      title="任务详情"
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText="保存"
      cancelText="取消"
      confirmLoading={saving}
      width={520}
      destroyOnHidden
    >
      <div className={styles.field}>
        <label className={styles.fieldLabel}>标题</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>描述</label>
        <Input.TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          autoSize={{ minRows: 2, maxRows: 6 }}
        />
      </div>

      <div className={styles.metaRow}>
        <div className={styles.metaItem}>
          <label className={styles.fieldLabel}>状态</label>
          <Select
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS}
            style={{ width: '100%' }}
          />
        </div>
        <div className={styles.metaItem}>
          <label className={styles.fieldLabel}>优先级</label>
          <Select
            value={priority}
            onChange={setPriority}
            options={PRIORITY_OPTIONS}
            style={{ width: '100%' }}
          />
        </div>
        <div className={styles.metaItem}>
          <label className={styles.fieldLabel}>截止日期</label>
          <DatePicker
            value={dueDate}
            onChange={setDueDate}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {task.postpone_count > 0 && (
        <div className={styles.postponeInfo}>
          <HistoryOutlined />
          已延期 {task.postpone_count} 次
          {task.postpone_reason && ` · ${task.postpone_reason}`}
        </div>
      )}

      <div className={styles.dangerZone}>
        <Popconfirm
          title="确认删除"
          description="删除后无法恢复，确定要删除吗？"
          onConfirm={handleDelete}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button danger icon={<DeleteOutlined />}>
            删除任务
          </Button>
        </Popconfirm>
      </div>
    </Modal>
  );
}
