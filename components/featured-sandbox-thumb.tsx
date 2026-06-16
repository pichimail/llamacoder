"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react/unstyled";
import { getSandpackConfig } from "@/lib/sandpack-config";
import { buildOgImagePath } from "@/lib/og-shared";
import Image from "next/image";

type SandboxFile = { path: string; content: string };

export function FeaturedSandboxThumb({
  slug,
  title,
  live = true,
}: {
  slug: string;
  title: string;
  live?: boolean;
}) {
  const [files, setFiles] = useState<SandboxFile[] | null>(null);
  const [motionOnly, setMotionOnly] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;

    fetch(`/api/featured/sandbox?slug=${encodeURIComponent(slug)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        if (data.motion) {
          setMotionOnly(true);
          setFiles([]);
          return;
        }
        setFiles(Array.isArray(data.files) ? data.files : []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, live]);

  const config = useMemo(() => {
    if (!files?.length) return null;
    return getSandpackConfig(files);
  }, [files]);

  if (!live || failed || motionOnly || !files?.length || !config) {
    return (
      <div className="relative h-full w-full bg-muted/40">
        <Image
          src={buildOgImagePath({ prompt: title })}
          alt={`${title} preview`}
          fill
          className="object-cover"
          unoptimized
        />
        {motionOnly ? (
          <span className="absolute bottom-2 right-2 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Motion template
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <SandpackProvider
      template={config.template}
      files={config.files}
      options={config.options}
      customSetup={config.customSetup}
    >
      <div className="pointer-events-none h-full w-full overflow-hidden bg-background">
        <SandpackPreview
          style={{ height: "100%", width: "100%" }}
          showOpenInCodeSandbox={false}
          showRefreshButton={false}
        />
      </div>
    </SandpackProvider>
  );
}