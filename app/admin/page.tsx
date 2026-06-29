"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Monitor and manage your Chinna-Coder platform.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Builds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">2,847</div>
            <p className="text-xs text-green-500">+18% this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">341</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">192</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">97.8%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest builds across the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center border-b pb-2">
              <div>Dashboard SaaS • by pichi</div>
              <Badge>Completed</Badge>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <div>Marketing Site • by demo</div>
              <Badge>Completed</Badge>
            </div>
            <div className="flex justify-between items-center">
              <div>Admin Panel • by test</div>
              <Badge variant="outline">In Progress</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Models</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>claude-3-5-sonnet</span> <span className="font-mono">64%</span></div>
              <div className="flex justify-between"><span>gpt-4o</span> <span className="font-mono">22%</span></div>
              <div className="flex justify-between"><span>gemini-pro</span> <span className="font-mono">14%</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
