import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePharmacy() {
  const user = await requireUser();
  if (user.accountType !== "PHARMACY") redirect("/courier/dashboard");
  return user;
}

export async function requireCourier() {
  const user = await requireUser();
  if (user.accountType !== "COURIER") redirect("/dashboard");
  return user;
}
