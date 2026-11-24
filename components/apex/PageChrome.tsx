import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

type Crumb = { label: string; href?: string };

/** @deprecated Prefer ApexPageHeader — kept for existing imports */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <ApexPageHeader title={title} description={description} actions={actions} />
  );
}

export function ApexPageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("apex-page-header space-y-4", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
            >
              {breadcrumbs.map((crumb, i) => (
                <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                  {i > 0 ? <ChevronRight className="h-3 w-3 shrink-0 opacity-50" /> : null}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="rounded-md px-1 py-0.5 transition-colors hover:bg-muted/50 hover:text-primary"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground/75">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          ) : null}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Apex console
            </p>
            <h1 className="apex-gradient-text text-2xl tracking-tight sm:text-3xl">{title}</h1>
            {description ? (
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function ApexSectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="apex-section-header flex items-end justify-between gap-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("apex-panel-surface rounded-xl border border-border/70 p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function ApexEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="apex-empty-state flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="apex-empty-icon flex h-12 w-12 items-center justify-center rounded-2xl">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}

export function ApexErrorAlert({ message }: { message: string }) {
  return (
    <div className="apex-error-alert flex items-start gap-3 rounded-xl border px-4 py-3 text-sm">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <p className="text-destructive">{message}</p>
    </div>
  );
}
