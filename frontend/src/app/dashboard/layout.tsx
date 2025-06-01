import { TRPCReactProvider } from "../trpc/rq-client";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getLogtoContext } from "@logto/next/server-actions";
import { logtoConfig } from "../logto";
import { redirect } from "next/navigation";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const ctx = await getLogtoContext(logtoConfig);
  console.log(ctx.userInfo);

  if (!ctx.isAuthenticated) {
    return redirect("/");
  }

  return (
    <TRPCReactProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar
          variant="inset"
          user={{
            name: ctx.claims?.name ?? "",
            email: ctx.claims?.email ?? "",
            avatar: ctx.claims?.picture ?? "",
          }}
        />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </TRPCReactProvider>
  );
}
