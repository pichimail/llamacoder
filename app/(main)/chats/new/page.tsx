import NewChatPageClient from "./page-client";

export default function NewChatPage({
  searchParams,
}: {
  searchParams?: { prompt?: string | string[]; model?: string | string[] };
}) {
  const prompt = Array.isArray(searchParams?.prompt)
    ? searchParams?.prompt[0]
    : searchParams?.prompt;
  const model = Array.isArray(searchParams?.model)
    ? searchParams?.model[0]
    : searchParams?.model;

  return <NewChatPageClient prompt={prompt ?? null} model={model ?? null} />;
}
