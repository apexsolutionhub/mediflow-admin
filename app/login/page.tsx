"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { APEX } from "@/constants/branding";
import { apexLogin, getErrorMessage, getStoredToken } from "@/lib/api";
import { ApexLogo } from "@/components/apex/ApexLogo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    if (getStoredToken()) router.replace("/dashboard");
  }, [router]);

  async function onSubmit(values: LoginValues) {
    try {
      await apexLogin(values.username.trim(), values.password);
      toast.success("Welcome back");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  return (
    <Card className="apex-glass-card overflow-hidden rounded-2xl border-border/40 shadow-2xl">
      <div className="apex-login-card-accent" />
      <CardHeader className="space-y-2 pb-1 pt-7">
        <CardTitle className="apex-login-signin text-2xl">Sign in</CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          Single Apex operations credential (seeded via Django admin)
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-8 pt-2">
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex items-center gap-3.5 pb-1">
            <ApexLogo
              size={56}
              priority
              className="shrink-0 drop-shadow-[0_0_20px_oklch(0.72_0.12_160/0.35)]"
            />
            <p className="text-sm leading-snug text-muted-foreground">
              Apex Solution — operations & monitoring
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-white/88">
                Username
              </Label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="apexMediflow"
                aria-invalid={Boolean(errors.username)}
                className={cn("apex-login-input", errors.username && "border-destructive/60")}
                {...register("username")}
              />
              {errors.username ? (
                <p className="text-xs text-destructive">{errors.username.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-white/88">
                Password
              </Label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Your admin password"
                aria-invalid={Boolean(errors.password)}
                className={cn("apex-login-input", errors.password && "border-destructive/60")}
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              ) : null}
            </div>
          </div>

          <Button
            type="submit"
            className="apex-btn-login h-11 w-full rounded-xl text-[15px]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner />
                Signing in…
              </>
            ) : (
              "Continue to dashboard"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      <section className="apex-login-hero relative flex flex-1 flex-col justify-between overflow-hidden p-8 lg:min-h-svh lg:max-w-[50%] lg:p-12">
        <div className="relative z-10 flex items-center gap-4">
          <ApexLogo
            size={52}
            priority
            className="drop-shadow-[0_0_24px_oklch(0.72_0.12_160/0.45)]"
          />
          <div>
            <p className="text-lg font-bold tracking-tight text-white">{APEX.name}</p>
            <p className="text-sm text-white/75">MediFlow operations</p>
          </div>
        </div>

        <div className="relative z-10 mt-14 max-w-lg space-y-5 lg:mt-0">
          <p className="inline-flex items-center rounded-full border border-white/18 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85 backdrop-blur-sm">
            Operations console
          </p>
          <h1 className="text-pretty text-3xl font-bold leading-[1.15] tracking-tight text-white sm:text-[2.35rem]">
            Manage every clinic from one colorful, focused command center
          </h1>
          <p className="text-pretty text-base leading-relaxed text-white/82 sm:text-lg">
            Approve setup and quarterly payments, chat with clinics, and monitor access —
            a warm, precise workspace built for daily operations.
          </p>
        </div>

        <p className="relative z-10 mt-10 text-xs text-white/50 lg:mt-0">
          Authorized Apex operations only
        </p>
      </section>

      <section className="apex-login-panel flex flex-1 items-center justify-center p-6 sm:p-10 lg:min-h-svh">
        <div className="w-full max-w-105 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
