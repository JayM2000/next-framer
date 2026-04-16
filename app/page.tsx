{/* ===== ORIGINAL DEFAULT PAGE — COMMENTED OUT =====
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  } else {
    redirect("/sign-in");
  }
}
===== END ORIGINAL DEFAULT PAGE ===== */}

import VaultApp from '@/components/vault/VaultApp';

export default function Home() {
  return <VaultApp />;
}
