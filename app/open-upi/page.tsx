import { redirect } from "next/navigation";

/** Legacy route — UPI is copy-only; confirmation lives on /payment-pending */
export default function OpenUpiPage() {
  redirect("/payment-pending");
}
