'use client';

import { useState } from 'react';
import { Globe, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';
import clsx from 'clsx';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg border border-border max-w-md w-full p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">
            Deployments
          </h2>
        </div>

        <div className="space-y-4">
          {/* Preview Deployment */}
          <div className="border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-foreground mb-2">Preview</h3>
            {previewUrl ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground truncate">
                  {previewUrl}
                </code>
                <button
                  onClick={() => handleCopy(previewUrl)}
                  className="p-1.5 hover:bg-muted rounded transition-colors"
                >
                  {copiedUrl === previewUrl ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-muted rounded transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No preview available</p>
            )}
          </div>

          {/* Production Deployment */}
          <div className="border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-foreground mb-2">Production</h3>
            {productionUrl ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground truncate">
                  {productionUrl}
                </code>
                <button
                  onClick={() => handleCopy(productionUrl)}
                  className="p-1.5 hover:bg-muted rounded transition-colors"
                >
                  {copiedUrl === productionUrl ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <a
                  href={productionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-muted rounded transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No production URL set</p>
            )}
          </div>

          {/* Deployment Status */}
          {deploymentStatus !== 'idle' && (
            <div
              className={clsx(
                'p-3 rounded-lg text-sm font-medium flex items-center gap-2',
                deploymentStatus === 'deploying' &&
                  'bg-blue-600/20 text-blue-600',
                deploymentStatus === 'success' &&
                  'bg-green-600/20 text-green-600',
                deploymentStatus === 'error' && 'bg-red-600/20 text-red-600'
              )}
            >
              {deploymentStatus === 'deploying' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deploying...
                </>
              )}
              {deploymentStatus === 'success' && (
                <>
                  <Check className="h-4 w-4" />
                  Successfully deployed
                </>
              )}
              {deploymentStatus === 'error' && (
                <>
                  <span>Deployment failed</span>
                </>
              )}
            </div>
          )}

          {/* Custom Domain */}
          <div className="border-t border-border pt-4">
            <label className="text-sm font-medium text-foreground block mb-2">
              Custom Domain
            </label>
            <input
              type="text"
              placeholder="your-domain.com"
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors mt-6"
        >
          Close
        </button>
      </div>
    </div>
  );
}
