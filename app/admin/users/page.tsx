"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminUsersPage() {
  // Mock data for demo - replace with real fetch in production
  const users = [
    { id: "1", name: "Pichi", email: "pichi@example.com", role: "admin", created: "2025-01-01" },
    { id: "2", name: "Demo User", email: "demo@example.com", role: "user", created: "2025-02-15" },
    { id: "3", name: "Test Account", email: "test@example.com", role: "user", created: "2025-03-10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Users</h1>
        <p className="text-muted-foreground">Manage user accounts and roles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>All registered users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Role</th>
                  <th className="text-left p-3">Created</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{user.name}</td>
                    <td className="p-3 text-muted-foreground">{user.email}</td>
                    <td className="p-3"><Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge></td>
                    <td className="p-3 text-muted-foreground">{user.created}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline">Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
