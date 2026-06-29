"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground">Usage insights and metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4" /> Builds Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">47</div>
            <p className="text-sm text-green-600">+12% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">128</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">Avg. Build Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">38s</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Models</CardTitle>
          <CardDescription>Most used LLMs this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span>claude-3-5-sonnet</span><span className="font-mono">62%</span></div>
            <div className="flex justify-between"><span>gpt-4o</span><span className="font-mono">21%</span></div>
            <div className="flex justify-between"><span>gemini-1.5-pro</span><span className="font-mono">17%</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
