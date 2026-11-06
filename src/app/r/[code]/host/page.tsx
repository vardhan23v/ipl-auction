import { redirect } from "next/navigation";
/** The host console is gone: hosts set up at /setup and run the auction from Live (⋯ menu). Old links land there. */
export default async function HostPage({ params }: { params: Promise<{ code: string }> }) {
  redirect(`/r/${(await params).code}/live`);
}
