import { ImageResponse } from "next/og";
import { PLUGINS } from "@/lib/plugins";
import { siteConfig } from "@/lib/site";

// Branded social-share card, generated at build/request time.
export const alt = siteConfig.ogImageAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "radial-gradient(1100px 600px at 18% 0%, #0060e6 0%, transparent 55%), radial-gradient(900px 600px at 100% 100%, #03bbfb 0%, transparent 50%), #060d1a",
          color: "#e8eefb",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              background: "linear-gradient(135deg, #0a84ff, #0060e6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
            }}
          >
            ⚡
          </div>
          <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: -1 }}>
            BizFlow
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 980,
            }}
          >
            Run your whole business in one beautiful app
          </div>
          <div style={{ fontSize: 30, color: "rgba(232,238,251,0.72)", maxWidth: 900 }}>
            POS, inventory & finance — plus modules for bakeries, restaurants,
            clinics, vets and gyms. Try it live in your browser.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {PLUGINS.slice(0, 7).map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 20px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                fontSize: 24,
              }}
            >
              <span style={{ fontSize: 28 }}>{p.icon}</span>
              <span style={{ color: "rgba(232,238,251,0.9)" }}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
