import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userName = (session?.user?.name ?? "Usuário").split(" ")[0];
  return <DashboardClient userName={userName} />;
}
