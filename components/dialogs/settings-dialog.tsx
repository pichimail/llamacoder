'use client';

import { useState } from 'react';
import { Settings, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EnvVar {
  key: string;
  value: string;
  isHidden?: boolean;
}

interface SettingsDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function SettingsDialog({
  isOpen = false,
  onClose,
}: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'env' | 'domains' | 'github'>('general');
  const [envVars] = useState<EnvVar[]>([
    { key: 'DATABASE_URL', value: '***', isHidden: true },
  ]);
  const [showValues] = useState(false);

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'env', label: 'Environment' },
    { id: 'domains', label: 'Domains' },
    { id: 'github', label: 'GitHub' },
  ];

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <AlertDialogContent className="flex h-[600px] max-w-2xl flex-col gap-0 p-0">
        <AlertDialogHeader className="flex-row items-center gap-2 border-b border-border px-6 py-4 text-left">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <AlertDialogTitle>Project Settings</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex gap-0 border-b border-border px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={clsx(
                'border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Project Name
                </label>
                <input
                  type="text"
                  defaultValue="My Project"
                  className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  defaultValue="A new project"
                  className="w-full resize-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
            </div>
          )}

          {activeTab === 'env' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">Environment Variables</h3>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Variable
                </button>
              </div>

              <div className="space-y-2">
                {envVars.map((envVar, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      defaultValue={envVar.key}
                      placeholder="KEY"
                      className="flex-1 rounded border border-border bg-muted/50 px-3 py-2 font-mono text-sm"
                    />
                    <input
                      type={showValues && !envVar.isHidden ? 'text' : 'password'}
                      defaultValue={envVar.value}
                      placeholder="value"
                      className="flex-1 rounded border border-border bg-muted/50 px-3 py-2 font-mono text-sm"
                    />
                    <button type="button" className="rounded p-1.5 hover:bg-muted">
                      {showValues && !envVar.isHidden ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="rounded p-1.5 hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'domains' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">Custom Domains</h3>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Domain
                </button>
              </div>

              <div className="py-8 text-center text-sm text-muted-foreground">
                No custom domains configured
              </div>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4">
                <h3 className="mb-2 font-medium text-foreground">GitHub Integration</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Connect your GitHub account to enable automatic deployments
                </p>
                <button
                  type="button"
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Connect GitHub
                </button>
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter className="border-t border-border px-6 py-4 sm:justify-stretch">
          <AlertDialogCancel className="flex-1" onClick={onClose}>
            Close
          </AlertDialogCancel>
          <AlertDialogAction className="flex-1 bg-blue-600 hover:bg-blue-700">
            Save Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}