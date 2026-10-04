import Cockpit from "@/components/cockpit/Cockpit";

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; session?: string }>;
}) {
  const { tab, session } = await searchParams;
  const initialTab = tab === "graph" || tab === "report" ? tab : "stream";
  return <Cockpit initialTab={initialTab} initialSessionId={session} />;
}
