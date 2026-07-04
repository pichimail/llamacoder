import { getProjectOverview } from '@/app/actions/projects'
import { ChatsCommandCenter } from '@/components/chats/chats-command-center'

export const dynamic = 'force-dynamic'

export default async function ChatsPage() {
  const projects = await getProjectOverview().catch(() => [])
  return <ChatsCommandCenter projects={projects} />
}
