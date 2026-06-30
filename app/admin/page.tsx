"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  FolderOpen, 
  MessageSquare, 
  BarChart3, 
  Download, 
  Play 
} from "lucide-react";
import Link from "next/link";

interface ActivityItem {
  id: number;
  title: string;
  user: string;
  status: string;
  time: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    builds: 2847,
    users: 341,
    projects: 192,
    successRate: 97.8,
  });

  const [activity, setActivity] = useState<ActivityItem[]>([
    { id: 1, title: "Dashboard SaaS", user: "pichi", status: "Completed", time: "2m ago" },
    { id: 2, title: "Marketing Site", user: "demo", status: "Completed", time: "14m ago" },
    { id: 3, title: "Admin Panel v2", user: "test", status: "In Progress", time: "31m ago" },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const filteredActivity = activity.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const simulateNewBuild = () => {
    const newBuild: ActivityItem = {
      id: Date.now(),
      title: `New Build #${Math.floor(Math.random() * 1000)}`,
      user: ["pichi", "demo", "alex", "jane"][Math.floor(Math.random() * 4)],
      status: Math.random() > 0.2 ? "Completed" : "In Progress",
      time: "just now",
    };

    setActivity([newBuild, ...activity.slice(0, 4)]);

    setStats(prev => ({
      builds: prev.builds + 1,
      users: prev.users,
      projects: prev.projects + (Math.random() > 0.7 ? 1 : 0),
      successRate: Math.min(99.9, prev.successRate + (Math.random() - 0.5) * 0.3),
    }));
  };

  const exportLogs = () => {
    const csv = activity.map(a => `${a.title},${a.user},${a.status},${a.time}`).join("\n");
    const blob = new Blob([`Title,User,Status,Time\n${csv}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "admin-activity.csv";
    a.click();
  };

  const clearActivity = () => {
    setActivity([]);
  };

  const topModels = [
    { name: "claude-3-5-sonnet", percent: 64 },
    { name: "gpt-4o", percent: 22 },
    { name: "gemini-pro", percent: 14 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Monitor and manage your Chinna-Coder platform.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={simulateNewBuild} variant="default" className="gap-2">
            <Play className="h-4 w-4" /> Simulate New Build
          </Button>
          <Button onClick={exportLogs} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export Logs
          </Button>
          <Button onClick={clearActivity} variant="outline">Clear Feed</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="activity">Live Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Dynamic Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="transition-all hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Total Builds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums">{stats.builds.toLocaleString()}</div>
                <p className="text-xs text-green-500">+18% this week • Live</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" /> Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums">{stats.users}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" /> Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums">{stats.projects}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums">{stats.successRate.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Activity Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Recent Activity
                  <Badge variant="outline" className="text-xs">Live</Badge>
                </CardTitle>
                <CardDescription>Real-time build updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {filteredActivity.length > 0 ? (
                  filteredActivity.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <div>
                        <div>{item.title}</div>
                        <div className="text-xs text-muted-foreground">by {item.user}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={item.status === "Completed" ? "default" : "outline"}>
                          {item.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{item.time}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No activity yet. Click "Simulate New Build".</p>
                )}
              </CardContent>
            </Card>

            {/* Top Models with Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Top Models</CardTitle>
                <CardDescription>Usage distribution (click to filter in future)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {topModels.map((model, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span>{model.name}</span>
                      <span className="font-mono text-muted-foreground">{model.percent}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all" 
                        style={{ width: `${model.percent}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Quick view - full controls in Users page</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span>pichi (admin)</span> 
                  <Badge>Online</Badge>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>demo@example.com</span> 
                  <Button size="sm" variant="outline">Promote</Button>
                </div>
                <Link href="/admin/users" className="block pt-2 text-primary hover:underline">View all users →</Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Live Activity Feed</CardTitle>
                  <CardDescription>Search and monitor all builds</CardDescription>
                </div>
                <Input 
                  placeholder="Search activity..." 
                  className="max-w-xs" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredActivity.length > 0 ? filteredActivity.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">by {item.user} • {item.time}</div>
                    </div>
                    <Badge>{item.status}</Badge>
                  </div>
                )) : <p>No matching activity.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
