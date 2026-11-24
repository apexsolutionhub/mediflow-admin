"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { ConsoleShell } from "@/components/ConsoleShell";
import { ApexFeedbackTenantContext } from "@/components/apex/feedback/ApexFeedbackTenantContext";
import { ApexPageHeader, Panel } from "@/components/apex/PageChrome";
import { ApexConfirmDialog } from "@/components/apex/ApexConfirmDialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  closeFeedbackThread,
  getErrorMessage,
  getFeedbackThread,
  isUnauthenticatedError,
  sendFeedbackMessage,
} from "@/lib/api";
import type { FeedbackMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function FeedbackThreadPage() {
  const params = useParams<{ id: string }>();
  const tin = decodeURIComponent(params.id);
  const [pharmacyName, setPharmacyName] = useState("");
  const [status, setStatus] = useState("open");
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const data = await getFeedbackThread(tin);
      setPharmacyName(data.thread.pharmacy_name);
      setStatus(data.thread.status);
      setMessages(data.messages);
    } catch (err) {
      if (!isUnauthenticatedError(err)) toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tin]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const messagesWithDividers = useMemo(() => {
    if (!messages.length) return [];
    let lastDate = "";
    return messages.map((msg) => {
      const dateLabel = formatDateLabel(msg.created_at);
      const showDivider = dateLabel !== lastDate;
      lastDate = dateLabel;
      return { msg, showDivider, dateLabel };
    });
  }, [messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      await sendFeedbackMessage(tin, text);
      setDraft("");
      await load();
      toast.success("Message sent");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <ConsoleShell>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Spinner /> Loading conversation…
        </div>
      ) : (
        <div className="flex min-h-[calc(100svh-10rem)] flex-col gap-6">
          <ApexPageHeader
            title={pharmacyName || tin}
            description={tin}
            breadcrumbs={[
              { label: "Clinic chat", href: "/feedback" },
              { label: pharmacyName || tin },
            ]}
            actions={
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="apex-row-action">
                  <Link href={`/tenants/${encodeURIComponent(tin)}`}>View tenant</Link>
                </Button>
                {status === "open" ? (
                  <ApexConfirmDialog
                    title="Close this chat thread?"
                    description="The clinic can still read past messages, but this thread will move out of your open queue."
                    confirmLabel="Close thread"
                    onConfirm={async () => {
                      try {
                        await closeFeedbackThread(tin);
                        await load();
                        toast.success("Thread closed");
                      } catch (err) {
                        toast.error(getErrorMessage(err) || "Failed");
                        throw err;
                      }
                    }}
                    trigger={
                      <Button variant="destructive" size="sm" className="apex-row-action">
                        Close thread
                      </Button>
                    }
                  />
                ) : null}
              </div>
            }
          />

          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
              <div
                ref={scrollRef}
                className="flex max-h-[min(62vh,540px)] min-h-75 flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-6"
              >
                {messages.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
                    <MessageCircle className="h-8 w-8 text-muted-foreground/50" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        Start the conversation
                      </p>
                      <p className="max-w-sm text-sm text-muted-foreground">
                        Send the first message — the clinic team will see it in their
                        app.
                      </p>
                    </div>
                  </div>
                ) : (
                  messagesWithDividers.map(({ msg, showDivider, dateLabel }) => {
                    const fromApex = msg.sender_side === "apex";
                    return (
                      <div key={msg.id}>
                        {showDivider ? (
                          <div className="apex-chat-date-divider">{dateLabel}</div>
                        ) : null}
                        <div
                          className={cn(
                            "flex max-w-[min(85%,28rem)] flex-col gap-1.5",
                            fromApex ? "ml-auto items-end" : "items-start",
                          )}
                        >
                          <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {fromApex
                              ? msg.sender_username || "Apex admin"
                              : msg.sender_username || "Tenant"}
                          </p>
                          <div
                            className={cn(
                              "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                              fromApex
                                ? "apex-chat-bubble-apex text-[oklch(0.94_0.01_85)]"
                                : "apex-chat-bubble-tenant border border-border text-foreground",
                            )}
                          >
                            {msg.image_url ? (
                              <a
                                href={msg.image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mb-2 block"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={msg.image_url}
                                  alt="Attachment"
                                  className="max-h-48 rounded-lg object-contain"
                                />
                              </a>
                            ) : null}
                            {msg.body ? (
                              <p className="whitespace-pre-wrap">{msg.body}</p>
                            ) : null}
                          </div>
                          <p className="px-1 text-[10px] tabular-nums text-muted-foreground">
                            {new Date(msg.created_at).toLocaleTimeString(undefined, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="apex-chat-composer flex gap-3 p-4 sm:p-5">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message… (Enter to send, Shift+Enter for new line)"
                  rows={2}
                  disabled={sending || status !== "open"}
                  className="min-h-12 resize-none border-border bg-background/80 focus-visible:ring-[oklch(0.65_0.05_85/0.25)]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                />
                <Button
                  variant="apex"
                  size="lg"
                  className="h-auto shrink-0 px-5"
                  disabled={!draft.trim() || sending || status !== "open"}
                  onClick={() => void handleSend()}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </Panel>
            <ApexFeedbackTenantContext pharmacyTin={tin} />
          </div>
        </div>
      )}
    </ConsoleShell>
  );
}
