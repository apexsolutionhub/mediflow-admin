"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { ConsoleShell } from "@/components/ConsoleShell";
import { ApexBroadcastChatDialog } from "@/components/apex/feedback/ApexBroadcastChatDialog";
import { ApexFeedbackDirectoryTable } from "@/components/apex/feedback/ApexFeedbackDirectoryTable";
import { ApexStartChatDialog } from "@/components/apex/feedback/ApexStartChatDialog";
import { ApexPageHeader, Panel } from "@/components/apex/PageChrome";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage, isUnauthenticatedError, listFeedbackDirectory } from "@/lib/api";
import type { FeedbackDirectoryRow } from "@/lib/types";

function FeedbackDirectory() {
  const searchParams = useSearchParams();
  const filterTin = searchParams.get("tin");
  const [search, setSearch] = useState("");
  const [allRows, setAllRows] = useState<FeedbackDirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listFeedbackDirectory();
      setAllRows(list);
    } catch (err) {
      if (!isUnauthenticatedError(err)) {
        toast.error(getErrorMessage(err) || "Failed to load clinics");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = allRows;
    if (filterTin) list = list.filter((t) => t.pharmacy_tin === filterTin);
    if (q) {
      list = list.filter((t) => {
        const hay = `${t.pharmacy_name} ${t.pharmacy_tin}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [allRows, search, filterTin]);

  return (
    <div className="space-y-8">
      <ApexPageHeader
        title="Clinic chat"
        description={
          filterTin
            ? `Filtered to TIN ${filterTin}`
            : "Message active clinics — reply to unread threads or start a new chat."
        }
        breadcrumbs={
          filterTin
            ? [{ label: "Clinic chat", href: "/feedback" }, { label: filterTin }]
            : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ApexBroadcastChatDialog onDone={() => void load()} />
            <ApexStartChatDialog
              defaultTin={filterTin ?? undefined}
              onDone={() => void load()}
            />
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-md sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by business name or TIN…"
            className="h-11 pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-semibold tabular-nums text-foreground">{rows.length}</span> of{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {allRows.length}
          </span>{" "}
          clinics
        </p>
      </div>

      <Panel className="overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center gap-2 px-5 py-14 text-muted-foreground">
            <Spinner /> Loading chats…
          </div>
        ) : (
          <ApexFeedbackDirectoryTable rows={rows} onStarted={() => void load()} />
        )}
      </Panel>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <ConsoleShell>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Spinner /> Loading chats…
          </div>
        }
      >
        <FeedbackDirectory />
      </Suspense>
    </ConsoleShell>
  );
}
