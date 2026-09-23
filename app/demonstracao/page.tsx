import { notFound } from "next/navigation";
import { DemoWorkspace } from "@/components/demo-workspace";
// An isolated visual fixture, never available in a production build.
export default function DemoPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <DemoWorkspace />;
}
