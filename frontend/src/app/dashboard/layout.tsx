import { TRPCReactProvider } from "../trpc/rq-client";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <TRPCReactProvider>{children}</TRPCReactProvider>;
}
