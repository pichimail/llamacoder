"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminProjectsPage() {
  const projects = [
    { id: "p1", name: "SaaS Dashboard", owner: "pichi", status: "active" },
    { id: "p2", name: "Landing Page v2", owner: "demo", status: "active" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Projects</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {projects.map(p => (
              <div key={p.id} className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-muted-foreground">by {p.owner}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View</Button>
                  <Button variant="destructive" size="sm">Archive</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
