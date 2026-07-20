"use client";

/** Admin storage overview: blob provider config status + real upload volume
 * from the FileUpload table. Previously an existing capability (blob-upload
 * config + audited FileUpload records) with zero admin visibility. */

import { useEffect, useState } from "react";
import { CheckCircle2, Files, HardDrive, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type StorageData = {
  configured: boolean;
  totals: { fileCount: number; totalBytes: number };
  byMimeType: Array<{ mimeType: string; count: number; bytes: number }>;
  recentUploads: Array<{ id: string; filename: string; mimeType: string; size: number; createdAt: string; user: string }>;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export default function AdminStoragePage() {
  const [data, setData] = useState<StorageData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/storage", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Storage</h1>
        <p className="text-muted-foreground">Blob provider status and upload volume — live from the database.</p>
      </div>

      {failed ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Could not load storage data. Check admin access and database connectivity.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Blob provider</CardDescription>
            {data ? (
              <CardTitle className="flex items-center gap-2 text-lg">
                {data.configured ? (
                  <>
                    <CheckCircle2 className="size-5 text-emerald-500" /> Configured
                  </>
                ) : (
                  <>
                    <XCircle className="size-5 text-muted-foreground" /> Not configured
                  </>
                )}
              </CardTitle>
            ) : (
              <Skeleton className="h-7 w-32" />
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs">
              <Files className="size-3.5" /> Total files
            </CardDescription>
            {data ? (
              <CardTitle className="text-3xl tabular-nums">{data.totals.fileCount.toLocaleString()}</CardTitle>
            ) : (
              <Skeleton className="h-9 w-16" />
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs">
              <HardDrive className="size-3.5" /> Total stored
            </CardDescription>
            {data ? (
              <CardTitle className="text-3xl tabular-nums">{formatBytes(data.totals.totalBytes)}</CardTitle>
            ) : (
              <Skeleton className="h-9 w-16" />
            )}
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By file type</CardTitle>
          <CardDescription>Breakdown of uploaded content types</CardDescription>
        </CardHeader>
        <CardContent className="h-48">
          {data === null ? (
            <Skeleton className="h-full w-full" />
          ) : data.byMimeType.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No files uploaded yet.</p>
          ) : (
            <div className="flex h-full flex-col justify-center gap-3">
              {data.byMimeType.map((row) => {
                const max = Math.max(...data.byMimeType.map((item) => item.bytes), 1);
                const width = Math.max(4, Math.round((row.bytes / max) * 100));
                return (
                  <div key={row.mimeType} className="grid grid-cols-[minmax(90px,220px)_1fr_90px] items-center gap-3 text-xs">
                    <span className="truncate text-muted-foreground">{row.mimeType}</span>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
                    </div>
                    <span className="text-right tabular-nums text-muted-foreground">
                      {row.count} · {formatBytes(row.bytes)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent uploads</CardTitle>
          <CardDescription>Last 20 files uploaded across all users</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {data === null ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : data.recentUploads.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No uploads yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentUploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell className="max-w-[220px] truncate text-sm">{upload.filename}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">{upload.user}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full text-[10px]">{upload.mimeType}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{formatBytes(upload.size)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">{new Date(upload.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
