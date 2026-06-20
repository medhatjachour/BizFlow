import type { Metadata } from "next";
import { Suspense } from "react";
import AuroraBackground from "@/components/AuroraBackground";
import Desktop from "@/components/desktop/Desktop";

export const metadata: Metadata = {
  title: "BizFlow Workspace",
  description: "Try every BizFlow module live in your browser.",
};

export default function AppPage() {
  return (
    <>
      <AuroraBackground />
      <Suspense fallback={null}>
        <Desktop />
      </Suspense>
    </>
  );
}
