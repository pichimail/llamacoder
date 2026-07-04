import { getPromptLibrary } from '@/app/actions/prompt-library'
import { PromptLibraryWorkbench } from '@/components/prompt-library/prompt-library-workbench'

export const dynamic = 'force-dynamic'

export default async function LibraryPage() {
  const prompts = await getPromptLibrary().catch(() => [])
  return <PromptLibraryWorkbench initialPrompts={prompts} />
}
