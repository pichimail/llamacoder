import { getProjectOverview } from '@/app/actions/projects'
import { ProjectsDashboard } from '@/components/projects/projects-dashboard'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const projects = await getProjectOverview().catch(() => [])
  return <ProjectsDashboard projects={projects} />
}
