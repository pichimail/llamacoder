'use client';

import { useState } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from 'react-resizable-panels';
import { WorkspaceSidebar } from './sidebar';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <ResizablePanelGroup direction="horizontal">
        {/* Sidebar */}
        <ResizablePanel
          defaultSize={sidebarCollapsed ? 5 : 20}
          minSize={5}
          maxSize={30}
          collapsible={true}
          className="hidden sm:block"
        >
          <WorkspaceSidebar
            isCollapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
          />
        </ResizablePanel>

        {sidebarCollapsed && <ResizableHandle withHandle />}
        {!sidebarCollapsed && <ResizableHandle withHandle />}

        {/* Main Content */}
        <ResizablePanel defaultSize={80} minSize={50}>
          <div className="flex flex-col h-screen overflow-hidden">
            {children}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
