import { Layout as AntLayout } from 'antd';
import { TopNav } from './TopNav';
import { StatusBar } from './StatusBar';
import { TaskPanel } from '@/components/TaskPanel';
import { ChatWindow } from '@/components/ChatWindow';
import { FocusTimer } from '@/components/FocusTimer';
import { useUIStore } from '@/stores/uiStore';
import styles from './index.module.css';

const { Header, Content, Footer } = AntLayout;

interface LayoutProps {
  mainContent?: React.ReactNode;
  chatContent?: React.ReactNode;
}

export function Layout({ mainContent, chatContent }: LayoutProps) {
  const chatPanelCollapsed = useUIStore((s) => s.chatPanelCollapsed);

  return (
    <AntLayout className={styles.layout}>
      <Header className={styles.header}>
        <TopNav />
      </Header>
      <Content className={styles.content}>
        <div className={styles.mainPanel}>
          {mainContent ?? <TaskPanel />}
        </div>
        {!chatPanelCollapsed && (
          <div className={styles.chatPanel}>
            {chatContent ?? <ChatWindow />}
          </div>
        )}
      </Content>
      <Footer className={styles.footer}>
        <StatusBar />
      </Footer>
      <FocusTimer />
    </AntLayout>
  );
}
