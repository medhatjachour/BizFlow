"use client";

/**
 * AuroraBackground renders the animated nebula/aurora gradient blobs plus a
 * subtle grid overlay. It is purely decorative and sits behind page content.
 */
export default function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Deep space base */}
      <div className="absolute inset-0 bg-background" />

      {/* Aurora blobs */}
      <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-biz-600/40 blur-[120px] animate-aurora" />
      <div className="absolute right-[-10rem] top-1/4 h-[30rem] w-[30rem] rounded-full bg-biz-300/30 blur-[120px] animate-float-slow" />
      <div className="absolute bottom-[-12rem] left-1/3 h-[32rem] w-[32rem] rounded-full bg-biz-700/40 blur-[130px] animate-aurora" />

      {/* Grid + vignette */}
      <div className="absolute inset-0 bg-grid opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(6,13,26,0.9)_100%)]" />
    </div>
  );
}
