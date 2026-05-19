import { useState, useEffect, useCallback } from 'react';
import {
  Slider,
  InputNumber,
  TimePicker,
  Select,
  Switch,
  Button,
  Input,
  Modal,
  Popconfirm,
  message,
  Spin,
} from 'antd';
import {
  RobotOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  BgColorsOutlined,
  KeyOutlined,
  DownloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Setting, Category, CategoryCreate, CategoryUpdate } from '@/types';
import { settingService } from '@/services/settingService';
import { categoryService } from '@/services/categoryService';
import { useUIStore } from '@/stores/uiStore';
import { useCategoryStore } from '@/stores/categoryStore';
import styles from './index.module.css';

const AI_STRICTNESS_LABELS: Record<number, { label: string; example: string }> = {
  1: {
    label: '温和鼓励',
    example: '今天完成了 3 个任务，很棒！还有 1 个没完成，明天加油哦~',
  },
  2: {
    label: '友善提醒',
    example: '今天完成了 3/4 的任务，不错。剩下的那个明天记得安排一下。',
  },
  3: {
    label: '中性客观',
    example: '今日完成率 75%。未完成：项目报告。建议明日优先处理。',
  },
  4: {
    label: '严格督促',
    example: '还有 1 个任务没完成，这已经是第 2 次拖延了。明天必须搞定。',
  },
  5: {
    label: '毒舌鞭策',
    example:
      '又没做完？这个任务你已经拖了 3 天了，再这样下去截止日期前肯定完不成。别找借口，明天第一件事就做这个。',
  },
};

const WEEKDAY_OPTIONS = [
  { value: 'monday', label: '周一' },
  { value: 'tuesday', label: '周二' },
  { value: 'wednesday', label: '周三' },
  { value: 'thursday', label: '周四' },
  { value: 'friday', label: '周五' },
  { value: 'saturday', label: '周六' },
  { value: 'sunday', label: '周日' },
];

const PRESET_COLORS = [
  '#7c3aed', '#6d28d9', '#4f46e5', '#3b82f6',
  '#06b6d4', '#14b8a6', '#10b981', '#22c55e',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899',
  '#8b5cf6', '#a78bfa', '#64748b', '#78716c',
];

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

type SettingsMap = Record<string, string>;

export function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsMap>({});
  const [categories, setCategories] = useState<Category[]>([]);

  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyTesting, setApiKeyTesting] = useState(false);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('📁');
  const [catColor, setCatColor] = useState(PRESET_COLORS[0]);
  const [catPriority, setCatPriority] = useState('medium');
  const [catSaving, setCatSaving] = useState(false);

  const [currentModel, setCurrentModel] = useState('');
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [modelInput, setModelInput] = useState('');
  const [modelSaving, setModelSaving] = useState(false);

  const [exportingJson, setExportingJson] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const { themeMode, toggleTheme } = useUIStore();
  const fetchStoreCategories = useCategoryStore((s) => s.fetchCategories);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsList, catList, keyStatus, modelInfo] = await Promise.all([
        settingService.list(),
        categoryService.list(),
        settingService.getApiKeyStatus(),
        settingService.getModel(),
      ]);
      const map: SettingsMap = {};
      settingsList.forEach((s: Setting) => {
        map[s.key] = s.value;
      });
      setSettings(map);
      setCategories(catList);
      setApiKeyConfigured(keyStatus.configured);
      setCurrentModel(modelInfo.model);
    } catch {
      message.error('加载设置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handler = () => loadData();
    window.addEventListener('settings-changed', handler);
    return () => window.removeEventListener('settings-changed', handler);
  }, [loadData]);

  const updateSetting = async (key: string, value: string) => {
    setSaving(true);
    try {
      await settingService.update(key, { value });
      setSettings((prev) => ({ ...prev, [key]: value }));
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const aiStrictness = parseInt(settings.ai_strictness || '3', 10);
  const dailyReviewTime = settings.daily_review_time || '21:00';
  const weeklyReviewDay = settings.weekly_review_day || 'sunday';
  const dailyAvailableHours = parseInt(settings.daily_available_hours || '8', 10);
  const focusMinutes = parseInt(settings.focus_minutes || '25', 10);
  const breakMinutes = parseInt(settings.break_minutes || '5', 10);

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      message.warning('请输入 API Key');
      return;
    }
    try {
      await settingService.updateApiKey(apiKeyInput.trim());
      setApiKeyConfigured(true);
      setApiKeyModalOpen(false);
      setApiKeyInput('');
      message.success('API Key 已保存');
    } catch {
      message.error('保存失败');
    }
  };

  const handleTestApiKey = async () => {
    setApiKeyTesting(true);
    try {
      const result = await settingService.testApiKey();
      if (result.success) {
        message.success(result.message);
      } else {
        message.error(result.message);
      }
    } catch {
      message.error('测试请求失败');
    } finally {
      setApiKeyTesting(false);
    }
  };

  const handleSaveModel = async () => {
    if (!modelInput.trim()) {
      message.warning('请输入模型名称');
      return;
    }
    setModelSaving(true);
    try {
      const result = await settingService.updateModel(modelInput.trim());
      setCurrentModel(result.model);
      setModelModalOpen(false);
      setModelInput('');
      message.success('模型已更新');
    } catch {
      message.error('保存失败');
    } finally {
      setModelSaving(false);
    }
  };

  const openCategoryModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setCatName(cat.name);
      setCatIcon(cat.icon);
      setCatColor(cat.color);
      setCatPriority(cat.default_priority);
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatIcon('📁');
      setCatColor(PRESET_COLORS[0]);
      setCatPriority('medium');
    }
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      message.warning('请输入分类名称');
      return;
    }
    setCatSaving(true);
    try {
      if (editingCategory) {
        const data: CategoryUpdate = {
          name: catName.trim(),
          icon: catIcon,
          color: catColor,
          default_priority: catPriority,
        };
        await categoryService.update(editingCategory.id, data);
        message.success('分类已更新');
      } else {
        const data: CategoryCreate = {
          name: catName.trim(),
          icon: catIcon,
          color: catColor,
          default_priority: catPriority,
        };
        await categoryService.create(data);
        message.success('分类已创建');
      }
      setCategoryModalOpen(false);
      const newCats = await categoryService.list();
      setCategories(newCats);
      fetchStoreCategories();
    } catch {
      message.error('操作失败');
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await categoryService.delete(id);
      message.success('分类已删除');
      const newCats = await categoryService.list();
      setCategories(newCats);
      fetchStoreCategories();
    } catch (err: any) {
      if (err?.status === 409) {
        message.error('该分类下有关联任务，无法删除');
      } else {
        message.error('删除失败');
      }
    }
  };

  const handleExportJson = async () => {
    setExportingJson(true);
    try {
      await settingService.exportJson();
      message.success('JSON 导出成功');
    } catch {
      message.error('导出失败');
    } finally {
      setExportingJson(false);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      await settingService.exportTasksCsv();
      message.success('CSV 导出成功');
    } catch {
      message.error('导出失败');
    } finally {
      setExportingCsv(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>设置</div>
        <div className={styles.subtitle}>自定义你的学习助手体验</div>
      </div>

      {/* AI 严厉程度 */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <RobotOutlined className={styles.sectionIcon} />
          AI 严厉程度
        </div>
        <div className={styles.sliderWrapper}>
          <Slider
            min={1}
            max={5}
            step={1}
            value={aiStrictness}
            marks={{
              1: '温和',
              2: '友善',
              3: '中性',
              4: '严格',
              5: '毒舌',
            }}
            onChange={(val: number) => updateSetting('ai_strictness', String(val))}
          />
        </div>
        <div className={styles.aiPreview}>
          <div className={styles.aiPreviewLabel}>
            等级 {aiStrictness} · {AI_STRICTNESS_LABELS[aiStrictness]?.label}
          </div>
          "{AI_STRICTNESS_LABELS[aiStrictness]?.example}"
        </div>
      </div>

      {/* 时间设置 */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <ClockCircleOutlined className={styles.sectionIcon} />
          时间设置
        </div>

        <div className={styles.formRow}>
          <div>
            <div className={styles.formLabel}>每日可用总时长</div>
            <div className={styles.formHint}>用于估算剩余学习时间</div>
          </div>
          <div className={styles.formControl}>
            <InputNumber
              min={1}
              max={24}
              value={dailyAvailableHours}
              onChange={(val) => val && updateSetting('daily_available_hours', String(val))}
              suffix="小时"
              style={{ width: 130 }}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div>
            <div className={styles.formLabel}>每日复盘时间</div>
            <div className={styles.formHint}>到时间后自动生成复盘报告</div>
          </div>
          <div className={styles.formControl}>
            <TimePicker
              format="HH:mm"
              value={dayjs(dailyReviewTime, 'HH:mm')}
              onChange={(val) => val && updateSetting('daily_review_time', val.format('HH:mm'))}
              style={{ width: 120 }}
              allowClear={false}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div>
            <div className={styles.formLabel}>每周复盘日</div>
            <div className={styles.formHint}>在该日自动生成周复盘报告</div>
          </div>
          <div className={styles.formControl}>
            <Select
              value={weeklyReviewDay}
              onChange={(val) => updateSetting('weekly_review_day', val)}
              options={WEEKDAY_OPTIONS}
              style={{ width: 120 }}
            />
          </div>
        </div>
      </div>

      {/* 番茄钟设置 */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <ThunderboltOutlined className={styles.sectionIcon} />
          番茄钟
        </div>

        <div className={styles.formRow}>
          <div className={styles.formLabel}>专注时长</div>
          <div className={styles.formControl}>
            <InputNumber
              min={5}
              max={120}
              step={5}
              value={focusMinutes}
              onChange={(val) => val && updateSetting('focus_minutes', String(val))}
              suffix="分钟"
              style={{ width: 130 }}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formLabel}>休息时长</div>
          <div className={styles.formControl}>
            <InputNumber
              min={1}
              max={30}
              step={1}
              value={breakMinutes}
              onChange={(val) => val && updateSetting('break_minutes', String(val))}
              suffix="分钟"
              style={{ width: 130 }}
            />
          </div>
        </div>
      </div>

      {/* 分类管理 */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <AppstoreOutlined className={styles.sectionIcon} />
          分类管理
        </div>

        <div className={styles.categoryList}>
          {categories.map((cat) => (
            <div key={cat.id} className={styles.categoryItem}>
              <div className={styles.categoryColor} style={{ background: cat.color }} />
              <span className={styles.categoryIcon}>{cat.icon}</span>
              <span className={styles.categoryName}>{cat.name}</span>
              <span className={styles.categoryPriority}>
                {PRIORITY_OPTIONS.find((p) => p.value === cat.default_priority)?.label ?? cat.default_priority}
              </span>
              <div className={styles.categoryActions}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openCategoryModal(cat)}
                />
                <Popconfirm
                  title="确认删除此分类？"
                  description="关联任务的分类将无法删除"
                  onConfirm={() => handleDeleteCategory(cat.id)}
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            </div>
          ))}
        </div>

        <Button
          type="dashed"
          icon={<PlusOutlined />}
          className={styles.addCategoryBtn}
          onClick={() => openCategoryModal()}
          block
        >
          新增分类
        </Button>
      </div>

      {/* 主题切换 */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <BgColorsOutlined className={styles.sectionIcon} />
          外观
        </div>

        <div className={styles.formRow}>
          <div>
            <div className={styles.formLabel}>深色模式</div>
            <div className={styles.formHint}>切换深色/浅色主题</div>
          </div>
          <div className={styles.formControl}>
            <Switch checked={themeMode === 'dark'} onChange={toggleTheme} />
          </div>
        </div>
      </div>

      {/* API Key */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <KeyOutlined className={styles.sectionIcon} />
          Qwen API Key
        </div>

        <div className={styles.formRow}>
          <div className={styles.apiKeyStatus}>
            <span
              className={`${styles.statusDot} ${apiKeyConfigured ? styles.statusDotOk : styles.statusDotNo}`}
            />
            {apiKeyConfigured ? (
              <span>
                <CheckCircleOutlined style={{ color: 'var(--sp-status-done)', marginRight: 4 }} />
                已配置
              </span>
            ) : (
              <span>
                <CloseCircleOutlined style={{ color: 'var(--sp-color-text-secondary)', marginRight: 4 }} />
                未配置
              </span>
            )}
          </div>
          <div className={styles.formControl} style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => setApiKeyModalOpen(true)}>
              {apiKeyConfigured ? '重新配置' : '配置'}
            </Button>
            {apiKeyConfigured && (
              <Button
                icon={<ApiOutlined />}
                loading={apiKeyTesting}
                onClick={handleTestApiKey}
              >
                测试连接
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* AI 模型 */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <RobotOutlined className={styles.sectionIcon} />
          AI 模型
        </div>

        <div className={styles.formRow}>
          <div>
            <div className={styles.formLabel}>当前模型</div>
            <div className={styles.formHint}>{currentModel || '未配置'}</div>
          </div>
          <div className={styles.formControl}>
            <Button
              onClick={() => {
                setModelInput(currentModel);
                setModelModalOpen(true);
              }}
            >
              更换模型
            </Button>
          </div>
        </div>
      </div>

      {/* 数据导出 */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <DownloadOutlined className={styles.sectionIcon} />
          数据导出
        </div>

        <div className={styles.exportButtons}>
          <Button
            icon={<DownloadOutlined />}
            loading={exportingJson}
            onClick={handleExportJson}
          >
            导出全部数据 (JSON)
          </Button>
          <Button
            icon={<DownloadOutlined />}
            loading={exportingCsv}
            onClick={handleExportCsv}
          >
            导出任务数据 (CSV)
          </Button>
        </div>
      </div>

      {/* API Key Modal */}
      <Modal
        title="配置 Qwen API Key"
        open={apiKeyModalOpen}
        onCancel={() => {
          setApiKeyModalOpen(false);
          setApiKeyInput('');
        }}
        onOk={handleSaveApiKey}
        okText="保存"
        cancelText="取消"
        width={440}
        destroyOnHidden
      >
        <div className={styles.field}>
          <label className={styles.fieldLabel}>API Key</label>
          <Input.Password
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="sk-..."
            autoComplete="off"
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--sp-color-text-secondary)' }}>
          Key 将写入本地 .env 文件，不会上传到任何第三方服务。
        </div>
      </Modal>

      {/* Category Edit Modal */}
      <Modal
        title={editingCategory ? '编辑分类' : '新增分类'}
        open={categoryModalOpen}
        onCancel={() => setCategoryModalOpen(false)}
        onOk={handleSaveCategory}
        okText={editingCategory ? '保存' : '创建'}
        cancelText="取消"
        confirmLoading={catSaving}
        width={440}
        destroyOnHidden
      >
        <div className={styles.field}>
          <label className={styles.fieldLabel}>名称</label>
          <Input
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="分类名称"
            maxLength={30}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>图标 (emoji)</label>
          <Input
            value={catIcon}
            onChange={(e) => setCatIcon(e.target.value)}
            placeholder="📁"
            maxLength={4}
            style={{ width: 80 }}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>主题色</label>
          <div className={styles.colorGrid}>
            {PRESET_COLORS.map((color) => (
              <div
                key={color}
                className={`${styles.colorSwatch} ${catColor === color ? styles.colorSwatchSelected : ''}`}
                style={{ background: color }}
                onClick={() => setCatColor(color)}
              />
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>默认优先级</label>
          <Select
            value={catPriority}
            onChange={setCatPriority}
            options={PRIORITY_OPTIONS}
            style={{ width: '100%' }}
          />
        </div>
      </Modal>

      {/* Model Modal */}
      <Modal
        title="更换 AI 模型"
        open={modelModalOpen}
        onCancel={() => {
          setModelModalOpen(false);
          setModelInput('');
        }}
        onOk={handleSaveModel}
        okText="保存"
        cancelText="取消"
        confirmLoading={modelSaving}
        width={440}
        destroyOnHidden
      >
        <div className={styles.field}>
          <label className={styles.fieldLabel}>模型名称</label>
          <Input
            value={modelInput}
            onChange={(e) => setModelInput(e.target.value)}
            placeholder="例如：qwen-plus、qwen-turbo、qwen-max"
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--sp-color-text-secondary)', lineHeight: 1.6 }}>
          输入通义千问 API 支持的模型名称。常用模型：
          <br />
          <code>qwen-plus</code> · <code>qwen-turbo</code> · <code>qwen-max</code> · <code>qwen-long</code>
        </div>
      </Modal>

      {saving && (
        <div style={{ position: 'fixed', top: 72, right: 24, zIndex: 1000 }}>
          <Spin size="small" />
        </div>
      )}
    </div>
  );
}
