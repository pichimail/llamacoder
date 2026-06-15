'use client';

import { useState } from 'react';
import { Globe, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeploymentPopoverProps {
  isOpen?: boolean;
  onClose?: () => void;
  projectName?: string;
  previewUrl?: string;
  productionUrl?: string;
  deploymentStatus?: 'idle' | 'deploying' | 'success' | 'error';
}

export function DeploymentPopover({
  isOpen = false,
  onClose,
  projectName = 'My Project',
  previewUrl,
  productionUrl,
  deploymentStatus = 'idle',
}: DeploymentPopoverProps) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <AlertDialogTitle>Deployments</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Preview and production URLs for {projectName}.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4">
            <h3 className="mb-2 text-sm font-medium text-foreground">Preview</h3>
            {previewUrl ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                  {previewUrl}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(previewUrl)}
                  className="rounded p-1.5 hover:bg-muted"
                >
                  {copiedUrl === previewUrl ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded p-1.5 hover:bg-muted"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No preview deployment yet</p>
            )}
          </div>

          <div className="rounded-lg border border-border p-4">
            <h3 className="mb-2 text-sm font-medium text-foreground">Production</h3>
            {productionUrl ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                  {productionUrl}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(productionUrl)}
                  className="rounded p-1.5 hover:bg-muted"
                >
                  {copiedUrl === productionUrl ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <a
                  href={productionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded p-1.5 hover:bg-muted"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not deployed to production</p>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
            {deploymentStatus === 'deploying' && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-muted-foreground">Deploying...</span>
              </>
            )}
            {deploymentStatus === 'success' && (
              <span className="text-green-600">Deployment successful</span>
            )}
            {deploymentStatus === 'error' && (
              <span className="text-red-500">Deployment failed</span>
            )}
            {deploymentStatus === 'idle' && (
              <span className="text-muted-foreground">Ready to deploy</span>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
