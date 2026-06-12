'use client';

import { useState } from 'react';
import { Settings, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

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
  const [envVars, setEnvVars] = useState<EnvVar[]>([
    { key: 'DATABASE_URL', value: '***', isHidden: true },
  ]);
  const [showValues, setShowValues] = useState(false);

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'env', label: 'Environment' },
    { id: 'domains', label: 'Domains' },
    { id: 'github', label: 'GitHub' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg border border-border max-w-2xl w-full h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Project Settings</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  defaultValue="My Project"
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Description
                </label>
                <textarea
                  defaultValue="A new project"
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Environment Tab */}
          {activeTab === 'env' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">Environment Variables</h3>
                <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                  <Plus className="h-4 w-4" />
                  Add Variable
                </button>
              </div>

              <div className="space-y-2">
                {envVars.map((envVar, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      defaultValue={envVar.key}
                      placeholder="KEY"
                      className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded text-sm font-mono"
                    />
                    <input
                      type={showValues && !envVar.isHidden ? 'text' : 'password'}
                      defaultValue={envVar.value}
                      placeholder="value"
                      className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded text-sm font-mono"
                    />
                    <button className="p-1.5 hover:bg-muted rounded">
                      {showValues && !envVar.isHidden ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                    <button className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Domains Tab */}
          {activeTab === 'domains' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">Custom Domains</h3>
                <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                  <Plus className="h-4 w-4" />
                  Add Domain
                </button>
              </div>

              <div className="text-sm text-muted-foreground text-center py-8">
                No custom domains configured
              </div>
            </div>
          )}

          {/* GitHub Tab */}
          {activeTab === 'github' && (
            <div className="space-y-4">
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium text-foreground mb-2">GitHub Integration</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your GitHub account to enable automatic deployments
                </p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Connect GitHub
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
          >
            Close
          </button>
          <button className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
