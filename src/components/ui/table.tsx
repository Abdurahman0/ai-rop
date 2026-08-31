import type { ReactNode } from "react";

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
}: {
  columns: { header: string; cell: (row: T) => ReactNode; className?: string }[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header} className={`border-b border-border px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground ${column.className ?? ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              className={`transition ${onRowClick ? "cursor-pointer hover:bg-muted/70" : ""}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td key={column.header} className={`border-b border-border px-4 py-2.5 align-middle text-foreground ${column.className ?? ""}`}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
