"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { brandIconPath } from "@/lib/site";

export default function MenuBar() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="glass-strong fixed inset-x-0 top-0 z-[9999] flex h-9 items-center justify-between px-4 text-sm">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image
            src={brandIconPath}
            alt="BizFlow logo"
            width={20}
            height={20}
            className="rounded"
          />
          BizFlow
        </Link>
        <span className="hidden text-foreground/50 sm:inline">Workspace</span>
      </div>

      <div className="flex items-center gap-4 text-foreground/70">
        <span className="hidden items-center gap-1.5 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Online
        </span>
        <time className="tabular-nums" suppressHydrationWarning>
          {now
            ? now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "--:--"}
        </time>
      </div>
    </div>
  );
}
