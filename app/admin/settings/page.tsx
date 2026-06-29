"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Application configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>Control core features of the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>SaaS Mode</Label>
              <p className="text-sm text-muted-foreground">Require accounts for builds</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Gallery Public</Label>
              <p className="text-sm text-muted-foreground">Show community builds publicly</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto Fix</Label>
              <p className="text-sm text-muted-foreground">Enable automatic preview repair</p>
            </div>
            <Switch defaultChecked />
          </div>

          <Button className="mt-4">Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
