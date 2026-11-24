import { redirect } from "next/navigation";

export default function YearlyPaymentsRedirect() {
  redirect("/payments/quarterly");
}
