import { WorkspaceLayout } from '@/components/workspace/workspace-layout';

export const metadata = {
  title: 'Chats | LlamaCoder',
  description: 'Manage your code generation chats',
};

export default function ChatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkspaceLayout>{children}</WorkspaceLayout>;
}
