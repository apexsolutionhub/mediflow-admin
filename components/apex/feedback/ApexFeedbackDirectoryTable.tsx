"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight, Building2, MessageCircle, MessagesSquare } from "lucide-react";
import { ApexDataTable } from "@/components/apex/ApexDataTable";
import { ApexFeedbackConversationTrigger } from "@/components/apex/feedback/ApexFeedbackConversationTrigger";
import { ApexStartChatDialog } from "@/components/apex/feedback/ApexStartChatDialog";
import { ChatStatusBadge, TabCountBadge } from "@/components/apex/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FeedbackDirectoryRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type ChatFilter = "all" | "needs_reply" | "open" | "closed" | "no_chat";

type ColumnMeta = {
  className?: string;
  headerClassName?: string;
};

type Props = {
  rows: FeedbackDirectoryRow[];
  onStarted?: () => void;
};

function formatRelativeTime(value: string | null) {
  if (!value) return "—";
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms)) return "—";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function PharmacyAvatar({
  logoUrl,
  emphasize,
}: {
  logoUrl?: string | null;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border",
        emphasize
          ? "border-[oklch(0.68_0.05_85/0.28)] bg-[oklch(0.68_0.05_85/0.12)]"
          : "border-border bg-muted/50",
      )}
      aria-hidden
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <Building2
          className={cn(
            "h-4 w-4",
            emphasize ? "text-[oklch(0.82_0.05_85)]" : "text-muted-foreground",
          )}
        />
      )}
    </div>
  );
}

export function ApexFeedbackDirectoryTable({ rows, onStarted }: Props) {
  const [filter, setFilter] = useState<ChatFilter>("all");

  const counts = useMemo(() => {
    let needsReply = 0;
    let open = 0;
    let closed = 0;
    let noChat = 0;
    for (const row of rows) {
      if (!row.thread_id) {
        noChat += 1;
        continue;
      }
      if (row.unread_count > 0) needsReply += 1;
      if (String(row.thread_status || "").toLowerCase() === "closed") closed += 1;
      else open += 1;
    }
    return { all: rows.length, needsReply, open, closed, noChat };
  }, [rows]);

  const snapshot = useMemo(() => {
    const source =
      filter === "all"
        ? rows
        : rows.filter((row) => {
            if (filter === "needs_reply") return row.unread_count > 0;
            if (filter === "no_chat") return !row.thread_id;
            if (filter === "closed")
              return (
                Boolean(row.thread_id) &&
                String(row.thread_status || "").toLowerCase() === "closed"
              );
            return (
              Boolean(row.thread_id) &&
              String(row.thread_status || "").toLowerCase() !== "closed"
            );
          });
    let needsReply = 0;
    let open = 0;
    let noChat = 0;
    for (const row of source) {
      if (!row.thread_id) noChat += 1;
      else if (String(row.thread_status || "").toLowerCase() !== "closed") open += 1;
      if (row.unread_count > 0) needsReply += 1;
    }
    return { needsReply, open, noChat };
  }, [rows, filter]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((row) => {
      if (filter === "needs_reply") return row.unread_count > 0;
      if (filter === "no_chat") return !row.thread_id;
      if (filter === "closed")
        return (
          Boolean(row.thread_id) &&
          String(row.thread_status || "").toLowerCase() === "closed"
        );
      return (
        Boolean(row.thread_id) &&
        String(row.thread_status || "").toLowerCase() !== "closed"
      );
    });
  }, [rows, filter]);

  const tabItems = [
    { value: "all" as const, label: "All", count: counts.all },
    { value: "needs_reply" as const, label: "Needs reply", count: counts.needsReply },
    { value: "open" as const, label: "Open", count: counts.open },
    { value: "closed" as const, label: "Closed", count: counts.closed },
    { value: "no_chat" as const, label: "No chat", count: counts.noChat },
  ];

  const columns = useMemo<ColumnDef<FeedbackDirectoryRow>[]>(
    () => [
      {
        id: "pharmacy",
        accessorKey: "pharmacy_name",
        header: "Clinic",
        size: 240,
        minSize: 180,
        meta: {
          className: "min-w-[12rem]",
          headerClassName: "min-w-[12rem]",
        } satisfies ColumnMeta,
        cell: ({ row }) => {
          const unread = row.original.unread_count > 0;
          return (
            <div className="flex items-start gap-3">
              <PharmacyAvatar
                logoUrl={row.original.logo_url}
                emphasize={unread}
              />
              <div className="min-w-0 space-y-0.5">
                <p
                  className={cn(
                    "truncate text-sm font-semibold tracking-tight",
                    unread ? "text-foreground" : "text-foreground/95",
                  )}
                >
                  {row.original.pharmacy_name || row.original.pharmacy_tin}
                </p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {row.original.pharmacy_tin}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "status",
        accessorKey: "thread_status",
        header: "Status",
        size: 120,
        minSize: 110,
        meta: {
          className: "whitespace-nowrap",
          headerClassName: "whitespace-nowrap",
        } satisfies ColumnMeta,
        cell: ({ row }) => (
          <ChatStatusBadge
            threadId={row.original.thread_id}
            status={row.original.thread_status}
          />
        ),
      },
      {
        id: "conversation",
        header: "Conversation",
        size: 260,
        minSize: 200,
        maxSize: 320,
        meta: {
          className: "max-w-[20rem]",
          headerClassName: "max-w-[20rem]",
        } satisfies ColumnMeta,
        cell: ({ row }) => {
          const msg = row.original.last_message;
          if (!msg?.body) {
            return (
              <span className="text-sm text-muted-foreground/80">No messages yet</span>
            );
          }
          return (
            <ApexFeedbackConversationTrigger
              pharmacyName={row.original.pharmacy_name || row.original.pharmacy_tin}
              pharmacyTin={row.original.pharmacy_tin}
              unreadFromTenant={row.original.unread_count}
              senderSide={msg.sender_side}
              body={msg.body}
              createdAt={msg.created_at}
            />
          );
        },
      },
      {
        accessorKey: "last_message_at",
        header: "Activity",
        size: 110,
        minSize: 100,
        meta: {
          className: "whitespace-nowrap",
          headerClassName: "whitespace-nowrap",
        } satisfies ColumnMeta,
        cell: ({ row }) => {
          const absolute = row.original.last_message_at
            ? new Date(row.original.last_message_at).toLocaleString()
            : undefined;
          return (
            <span
              className="text-sm tabular-nums text-muted-foreground"
              title={absolute}
            >
              {formatRelativeTime(row.original.last_message_at)}
            </span>
          );
        },
      },
      {
        id: "open",
        header: () => <div className="text-right">Action</div>,
        enableSorting: false,
        enableHiding: false,
        size: 130,
        minSize: 120,
        meta: {
          className: "whitespace-nowrap",
          headerClassName: "whitespace-nowrap",
          label: "Action",
        } satisfies ColumnMeta & { label: string },
        cell: ({ row }) => {
          if (row.original.thread_id) {
            return (
              <div className="flex justify-end">
                <Button
                  asChild
                  size="sm"
                  variant={row.original.unread_count > 0 ? "apex" : "outline"}
                  className="apex-row-action h-9 gap-1.5 rounded-xl px-3"
                >
                  <Link href={`/feedback/${encodeURIComponent(row.original.pharmacy_tin)}`}>
                    Open
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-80" />
                  </Link>
                </Button>
              </div>
            );
          }
          return (
            <div className="flex justify-end">
              <ApexStartChatDialog
                defaultTin={row.original.pharmacy_tin}
                onDone={onStarted}
                trigger={
                  <Button
                    size="sm"
                    variant="apex"
                    className="apex-row-action h-9 gap-1.5 rounded-xl px-3"
                  >
                    Start
                    <MessageCircle className="h-3.5 w-3.5 opacity-90" />
                  </Button>
                }
              />
            </div>
          );
        },
      },
    ],
    [onStarted],
  );

  return (
    <div className="space-y-5 pt-4">
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as ChatFilter)}
        className="w-full"
      >
        <TabsList className="h-auto w-full flex-wrap justify-start gap-2.5 rounded-none border-0 bg-transparent p-0 px-4 shadow-none sm:px-5">
          {tabItems.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="apex-tabs-trigger h-11 flex-none gap-2 rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-left leading-none shadow-sm transition-all duration-150 hover:border-border hover:bg-muted/60 data-[state=active]:border-primary/30 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <span className="text-sm font-medium tracking-tight">{tab.label}</span>
              <TabCountBadge count={tab.count} />
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mx-4 flex flex-col gap-4 rounded-2xl border border-border bg-linear-to-r from-background/95 via-background/82 to-background/95 px-4 py-4 shadow-sm sm:mx-5 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-[oklch(0.68_0.05_85/0.16)] bg-[oklch(0.68_0.05_85/0.08)] p-2.5">
            <MessagesSquare className="h-4.5 w-4.5 text-[oklch(0.82_0.05_85)]" />
          </div>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Chat snapshot
              </p>
              <Badge variant="outline">
                {filter === "all"
                  ? "All clinics"
                  : tabItems.find((t) => t.value === filter)?.label}
              </Badge>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Active clinics only — jump into open threads or start a new
              conversation when something needs attention.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-500/14 bg-amber-500/6 px-3.5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-800">
              Needs reply
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {snapshot.needsReply}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Unread messages from tenants
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/14 bg-emerald-500/6 px-3.5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700">
              Open threads
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {snapshot.open}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Conversations currently active
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/50 px-3.5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              No chat yet
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {snapshot.noChat}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ready to start when needed
            </p>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mx-4 mb-4 rounded-2xl border border-dashed border-border bg-muted/25 px-6 py-14 text-center sm:mx-5">
          <MessageCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">No clinics in this view</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another filter, or start a chat from the header.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden border-t border-border">
          <ApexDataTable
            data={filtered}
            columns={columns}
            noun="clinics"
            pageSize={10}
            showToolbar={false}
            rowClassName={(row) =>
              row.unread_count > 0
                ? "bg-[oklch(0.68_0.05_85/0.035)] hover:bg-[oklch(0.68_0.05_85/0.06)]"
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
