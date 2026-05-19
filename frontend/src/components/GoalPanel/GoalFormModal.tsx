import { useState, useEffect } from 'react';
import { Modal, Input, Select, DatePicker, Button, Popconfirm, message } from 'antd';
import { DeleteOutlined, AimOutlined, CalendarOutlined, CheckSquareOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Goal, GoalType, GoalCreate, GoalUpdate } from '@/types';
import styles from './GoalFormModal.module.css';

const TYPE_OPTIONS: { value: GoalType; label: string; icon: React.ReactNode }[] = [
  { value: 'ultimate', label: '终极目标', icon: <AimOutlined /> },
  { value: 'monthly', label: '月目标', icon: <CalendarOutlined /> },
  { value: 'weekly', label: '周目标', icon: <CheckSquareOutlined /> },
];

interface GoalFormModalProps {
  open: boolean;
  editGoal: Goal | null;
  parentGoal?: Goal | null;
  allGoals: Goal[];
  onClose: () => void;
  onCreate: (data: GoalCreate) => Promise<void>;
  onUpdate: (id: number, data: GoalUpdate) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function GoalFormModal({
  open, editGoal, parentGoal, allGoals, onClose, onCreate, onUpdate, onDelete,
}: GoalFormModalProps) {
  const isEdit = !!editGoal;

  const [goalType, setGoalType] = useState<GoalType>('ultimate');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [targetDate, setTargetDate] = useState<dayjs.Dayjs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editGoal) {
      setGoalType(editGoal.type);
      setTitle(editGoal.title);
      setDescription(editGoal.description ?? '');
      setParentId(editGoal.parent_goal_id);
      setTargetDate(editGoal.target_date ? dayjs(editGoal.target_date) : null);
    } else {
      if (parentGoal) {
        const childType: GoalType = parentGoal.type === 'ultimate' ? 'monthly' : 'weekly';
        setGoalType(childType);
        setParentId(parentGoal.id);
      } else {
        setGoalType('ultimate');
        setParentId(null);
      }
      setTitle('');
      setDescription('');
      setTargetDate(null);
    }
  }, [editGoal, parentGoal, open]);

  const parentOptions = goalType === 'monthly'
    ? allGoals.filter((g) => g.type === 'ultimate' && g.status === 'active')
    : goalType === 'weekly'
      ? allGoals.filter((g) => g.type === 'monthly' && g.status === 'active')
      : [];

  const handleSave = async () => {
    if (!title.trim()) {
      message.warning('请输入目标标题');
      return;
    }
    if (goalType !== 'ultimate' && !parentId) {
      message.warning('请选择父目标');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await onUpdate(editGoal!.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          target_date: targetDate ? targetDate.format('YYYY-MM-DD') : null,
        });
        message.success('目标已更新');
      } else {
        await onCreate({
          type: goalType,
          title: title.trim(),
          description: description.trim() || undefined,
          parent_goal_id: goalType === 'ultimate' ? undefined : parentId,
          target_date: targetDate ? targetDate.format('YYYY-MM-DD') : undefined,
        });
        message.success('目标已创建');
      }
      onClose();
    } catch {
      message.error(isEdit ? '更新失败' : '创建失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editGoal) return;
    try {
      await onDelete(editGoal.id);
      message.success('已删除');
      onClose();
    } catch {
      message.error('删除失败');
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑目标' : '创建目标'}
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText={isEdit ? '保存' : '创建'}
      cancelText="取消"
      confirmLoading={saving}
      width={520}
      destroyOnHidden
    >
      {!isEdit && (
        <div className={styles.typeSelector}>
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.typeBtn} ${goalType === opt.value ? styles.typeBtnActive : ''}`}
              onClick={() => {
                setGoalType(opt.value);
                setParentId(null);
              }}
            >
              <span className={styles.typeIcon}>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.fieldLabel}>标题</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="输入目标标题…"
          maxLength={100}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>描述（可选）</label>
        <Input.TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="描述一下这个目标…"
          rows={3}
          autoSize={{ minRows: 2, maxRows: 5 }}
        />
      </div>

      {goalType !== 'ultimate' && (
        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            {goalType === 'monthly' ? '所属终极目标' : '所属月目标'}
          </label>
          <Select
            value={parentId}
            onChange={setParentId}
            placeholder="请选择父目标"
            style={{ width: '100%' }}
            options={parentOptions.map((g) => ({ value: g.id, label: g.title }))}
            disabled={isEdit}
          />
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.fieldLabel}>目标截止日期（可选）</label>
        <DatePicker
          value={targetDate}
          onChange={setTargetDate}
          style={{ width: '100%' }}
          placeholder="选择截止日期"
        />
      </div>

      {isEdit && (
        <div className={styles.dangerZone}>
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，子目标也会失去关联。确定要删除吗？"
            onConfirm={handleDelete}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>删除目标</Button>
          </Popconfirm>
        </div>
      )}
    </Modal>
  );
}
