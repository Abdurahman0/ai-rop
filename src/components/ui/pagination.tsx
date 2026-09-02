"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/i18n/use-t";
import { PAGE_SIZE } from "@/lib/api/client";
import { Button } from "./button";

export function Pagination({
  page,
  count,
  pageSize = PAGE_SIZE,
  onPageChange,
}: {
  page: number;
  count: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}) {
  const t = useT();
  const pages = Math.max(1, Math.ceil(count / pageSize));
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
      <span>{t("common.pageOf", { page, pages })}</span>
      <div className="flex gap-2">
        <Button size="sm" icon={<ChevronLeft className="h-4 w-4" />} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          {t("common.previous")}
        </Button>
        <Button size="sm" icon={<ChevronRight className="h-4 w-4" />} disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          {t("common.next")}
        </Button>
      </div>
    </div>
  );
}
