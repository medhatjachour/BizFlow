/**
 * BizFlow plugin catalog — the single source of truth for the marketing site
 * and the in-browser desktop. Mirrors the module metadata in the BizFlow app
 * (src/shared/modules.ts).
 *
 * Each plugin can be tried live in the browser (deep-linked into the BizFlow
 * web app by route) and downloaded as its own desktop build.
 */
export interface PluginHighlight {
  /** Big value, e.g. "30s" or "−40%". */
  value: string;
  /** What it means, e.g. "faster checkout". */
  label: string;
}

export interface BizPlugin {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Longer marketing paragraph shown on the buy/detail view. */
  longDescription: string;
  /** Emoji used as a lightweight icon in cards and the dock. */
  icon: string;
  /** Tailwind gradient classes for the icon tile / accents. */
  accent: string;
  /** Route inside the BizFlow web app to deep-link the live demo. */
  route: string;
  /** Headline benefits with a metric, shown as chips. */
  highlights: PluginHighlight[];
  /** Full capability list. */
  features: string[];
  /** Who it's for. */
  bestFor: string;
  /** One-time license price (USD), illustrative. */
  price: number;
  /** Marks a featured/most-popular module. */
  popular?: boolean;
  /** Env var name that can override this plugin's download URL. */
  downloadEnv: string;
}

export const PLUGINS: BizPlugin[] = [
  {
    id: "commerce",
    name: "Commerce",
    tagline: "Retail & Point of Sale",
    description:
      "Products, inventory, a fast POS, sales history and multi-store management — the retail core.",
    longDescription:
      "The heart of BizFlow. Ring up sales in seconds, track every item across stores, and never run out of stock again. Built for shops that want speed at the counter and clarity in the back office.",
    icon: "🛒",
    accent: "from-sky-400 to-blue-600",
    route: "/products",
    popular: true,
    bestFor: "Retail shops, boutiques & multi-branch stores",
    price: 299,
    highlights: [
      { value: "30s", label: "to ring a sale" },
      { value: "∞", label: "products & variants" },
      { value: "100%", label: "offline-capable" },
    ],
    features: [
      "Lightning-fast Point of Sale with barcode scanning",
      "Product catalog with variants, images & categories",
      "Real-time inventory with low-stock & reorder alerts",
      "Sales history, refunds & partial returns",
      "Multi-store & branch management",
      "Suppliers & purchase orders",
      "Installments & deposit payments",
      "Thermal receipt printing & barcode labels",
    ],
    downloadEnv: "NEXT_PUBLIC_DL_COMMERCE",
  },
  {
    id: "bakery",
    name: "Bakery",
    tagline: "Production & Recipes",
    description:
      "Recipe builder, production batch scheduling, ingredient pantry and waste tracking for bakeries.",
    longDescription:
      "Plan production, cost every recipe to the gram, and cut waste. BizFlow Bakery turns guesswork into a daily schedule your team can actually follow.",
    icon: "🥐",
    accent: "from-amber-300 to-orange-500",
    route: "/bakery",
    bestFor: "Bakeries, patisseries & central kitchens",
    price: 199,
    highlights: [
      { value: "−40%", label: "ingredient waste" },
      { value: "per-gram", label: "recipe costing" },
      { value: "daily", label: "production board" },
    ],
    features: [
      "Recipe builder with yield & per-unit cost",
      "Production batch scheduling & tracking",
      "Pantry / ingredient stock management",
      "Automatic ingredient deduction per batch",
      "Waste & spoilage logging with analytics",
      "Daily production schedule board",
      "Profit & loss per product",
    ],
    downloadEnv: "NEXT_PUBLIC_DL_BAKERY",
  },
  {
    id: "restaurant",
    name: "Restaurant",
    tagline: "Tables & Dine-in",
    description:
      "Visual table management, reservations, dine-in orders and per-category menu management.",
    longDescription:
      "Run the floor with confidence: seat guests, fire orders to the kitchen, and turn tables faster — all from one screen built for the dinner rush.",
    icon: "🍽️",
    accent: "from-rose-400 to-pink-600",
    route: "/restaurant",
    bestFor: "Restaurants, cafés & dine-in venues",
    price: 249,
    highlights: [
      { value: "live", label: "table layout" },
      { value: "1-tap", label: "order to kitchen" },
      { value: "0", label: "double bookings" },
    ],
    features: [
      "Visual floor plan & table status",
      "Reservations with guest details & conflict checks",
      "Dine-in order creation from the table",
      "Per-category menu management",
      "Kitchen-ready order status board",
      "Split & merge tables",
      "Integrates with Commerce products & sales",
    ],
    downloadEnv: "NEXT_PUBLIC_DL_RESTAURANT",
  },
  {
    id: "warehouse",
    name: "Warehouse",
    tagline: "Multi-location Stock",
    description:
      "Multi-location inventory with bin tracking and inter-location stock transfers with full audit trail.",
    longDescription:
      "Know exactly what's where. Track stock across warehouses and bins, move it with a full paper trail, and get alerted before any location runs dry.",
    icon: "🏭",
    accent: "from-blue-400 to-indigo-600",
    route: "/warehouse",
    bestFor: "Distributors & multi-warehouse operations",
    price: 199,
    highlights: [
      { value: "multi", label: "locations & bins" },
      { value: "audited", label: "every transfer" },
      { value: "real-time", label: "stock levels" },
    ],
    features: [
      "Multiple warehouse & location management",
      "Per-location, per-bin stock levels",
      "Stock transfers between locations",
      "Full transfer history & audit trail",
      "Low-stock alerts per location",
      "Integrates with Commerce inventory",
    ],
    downloadEnv: "NEXT_PUBLIC_DL_WAREHOUSE",
  },
  {
    id: "clinic",
    name: "Clinic",
    tagline: "Patients & Sessions",
    description:
      "Patient records, medical session notes, prescriptions and clinical statistics for clinics.",
    longDescription:
      "A calm, organized clinic. Keep complete patient histories, record sessions with vitals, issue prescriptions, and see your practice's health at a glance.",
    icon: "🏥",
    accent: "from-teal-300 to-cyan-600",
    route: "/clinic",
    bestFor: "Clinics, dentists & private practices",
    price: 279,
    highlights: [
      { value: "full", label: "patient history" },
      { value: "PDF", label: "prescriptions" },
      { value: "1 place", label: "vitals & notes" },
    ],
    features: [
      "Patient records with full medical history",
      "Session notes with vitals tracking",
      "Prescription management per visit",
      "Check results & document attachments (PDF)",
      "Appointment scheduling & follow-ups",
      "Clinical statistics & diagnosis trends",
      "Materials & inventory for treatments",
    ],
    downloadEnv: "NEXT_PUBLIC_DL_CLINIC",
  },
  {
    id: "vet",
    name: "Vet Clinic",
    tagline: "Pets & Owners",
    description:
      "Veterinary clinic management — pet patients with owner records, sessions, appointments and stats.",
    longDescription:
      "Built for animal care: link every pet to its owner, track visits and prescriptions, and stay on top of appointments and follow-ups.",
    icon: "🐾",
    accent: "from-violet-400 to-purple-600",
    route: "/vet",
    bestFor: "Veterinary clinics & animal hospitals",
    price: 279,
    highlights: [
      { value: "pet↔owner", label: "linked records" },
      { value: "smart", label: "appointment alerts" },
      { value: "PDF", label: "check results" },
    ],
    features: [
      "Pet patient records with owner information",
      "Veterinary session notes & vitals",
      "Prescription management per visit",
      "Appointment scheduling with conflict detection",
      "Follow-up reminders & overdue tracking",
      "Medicine inventory & batches",
      "Clinical statistics & diagnosis trends",
    ],
    downloadEnv: "NEXT_PUBLIC_DL_VET",
  },
  {
    id: "gym",
    name: "Gym",
    tagline: "Members & Plans",
    description:
      "Gym management — coaches, trainees, subscription plans, walk-in sessions and financial tracking.",
    longDescription:
      "Grow your gym: manage members and coaches, sell flexible plans with freeze support, log walk-ins, and watch the revenue roll up automatically.",
    icon: "🏋️",
    accent: "from-orange-400 to-red-500",
    route: "/gym",
    bestFor: "Gyms, studios & fitness centers",
    price: 199,
    highlights: [
      { value: "flexible", label: "plans & freezes" },
      { value: "QR", label: "coach check-in" },
      { value: "auto", label: "revenue tracking" },
    ],
    features: [
      "Trainee profiles with subscription history",
      "Coach roster with specialties & QR codes",
      "Flexible subscription plans with freeze support",
      "Walk-in session logging",
      "Body measurements & goal tracking",
      "Expense tracking & financial reporting",
    ],
    downloadEnv: "NEXT_PUBLIC_DL_GYM",
  },
];

export const getPlugin = (id: string) => PLUGINS.find((p) => p.id === id);

/** Base URL of the live BizFlow web app embedded in the desktop window. */
export const BIZFLOW_URL =
  process.env.NEXT_PUBLIC_BIZFLOW_URL || "http://localhost:5180/";

/** Default download URL when a plugin-specific one isn't configured. */
export const DEFAULT_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_DOWNLOAD_URL ||
  "https://github.com/medhatjachour/electron-app/releases/latest";

/** Resolve the download URL for a plugin, honoring its per-plugin env override. */
export function downloadUrlFor(plugin: BizPlugin): string {
  return process.env[plugin.downloadEnv] || DEFAULT_DOWNLOAD_URL;
}

/**
 * Build the live-demo URL for a plugin. The `?only=<id>` query tells the
 * BizFlow web bridge to scope the app to just this module (isolated demo);
 * the hash route deep-links to the module's page.
 */
export function demoUrlFor(plugin: BizPlugin): string {
  const base = BIZFLOW_URL.endsWith("/") ? BIZFLOW_URL : `${BIZFLOW_URL}/`;
  return `${base}?only=${plugin.id}#${plugin.route}`;
}
