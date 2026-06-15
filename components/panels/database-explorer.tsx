'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Database, Table } from 'lucide-react';
import clsx from 'clsx';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
}

interface DatabaseTable {
  name: string;
  columns: Column[];
  rows?: number;
  isOpen?: boolean;
}

interface DatabaseExplorerProps {
  tables?: DatabaseTable[];
}

const DEFAULT_TABLES: DatabaseTable[] = [
  {
    name: 'users',
    rows: 42,
    columns: [
      { name: 'id', type: 'UUID', nullable: false },
      { name: 'email', type: 'VARCHAR', nullable: false },
      { name: 'name', type: 'VARCHAR', nullable: true },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false },
    ],
    isOpen: true,
  },
  {
    name: 'posts',
    rows: 128,
    columns: [
      { name: 'id', type: 'UUID', nullable: false },
      { name: 'title', type: 'VARCHAR', nullable: false },
      { name: 'content', type: 'TEXT', nullable: false },
      { name: 'user_id', type: 'UUID', nullable: false },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false },
    ],
  },
  {
    name: 'comments',
    rows: 356,
    columns: [
      { name: 'id', type: 'UUID', nullable: false },
      { name: 'content', type: 'TEXT', nullable: false },
      { name: 'post_id', type: 'UUID', nullable: false },
      { name: 'user_id', type: 'UUID', nullable: false },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false },
    ],
  },
];

export function DatabaseExplorer({ tables = DEFAULT_TABLES }: DatabaseExplorerProps) {
  const [tableList, setTableList] = useState(tables);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const toggleTable = (name: string) => {
    setTableList(
      tableList.map((t) =>
        t.name === name ? { ...t, isOpen: !t.isOpen } : t
      )
    );
  };

  const currentTable = tableList.find((t) => t.name === selectedTable);

  return (
    <div className="h-full flex flex-col bg-muted/20 border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Database</h3>
        </div>
      </div>

      {/* Table List */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-2 space-y-1">
          {tableList.map((table) => (
            <div key={table.name}>
              <button
                onClick={() => {
                  toggleTable(table.name);
                  setSelectedTable(table.name);
                }}
                className={clsx(
                  'w-full flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors',
                  selectedTable === table.name
                    ? 'bg-blue-600/20 text-blue-600'
                    : 'hover:bg-muted/50 text-foreground'
                )}
              >
                {table.isOpen ? (
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                )}
                <Table className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium truncate">{table.name}</div>
                </div>
                {table.rows !== undefined && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {table.rows}
                  </span>
                )}
              </button>

              {table.isOpen && (
                <div className="ml-2 mt-1 space-y-1 border-l border-border/30 pl-3">
                  {table.columns.map((col) => (
                    <div
                      key={`${table.name}.${col.name}`}
                      className="flex items-center gap-2 px-3 py-1 text-xs rounded text-muted-foreground hover:bg-muted/50"
                    >
                      <span className="font-mono text-foreground">{col.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {col.type}
                      </span>
                      {col.nullable && (
                        <span className="text-xs text-orange-500">?</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Table Details */}
      {currentTable && (
        <div className="border-t border-border bg-background p-4 max-h-48 overflow-y-auto">
          <h4 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
            Schema
          </h4>
          <div className="space-y-2 text-xs font-mono text-muted-foreground">
            {currentTable.columns.map((col) => (
              <div key={col.name} className="flex items-center gap-2">
                <span className="text-foreground">{col.name}</span>
                <span className="text-xs">{col.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
