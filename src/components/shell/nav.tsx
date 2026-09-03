import { Bot, Building2, ClipboardList, DatabaseZap, FileText, LayoutDashboard, Palette, PhoneCall } from "lucide-react";

export const navGroups = [
  {
    labelKey: "nav.overview",
    items: [{ labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    labelKey: "nav.sales",
    items: [
      { labelKey: "nav.leads", href: "/leads", icon: ClipboardList },
      { labelKey: "nav.clients", href: "/clients", icon: Building2 },
    ],
  },
  {
    labelKey: "nav.intelligence",
    items: [
      { labelKey: "nav.calls", href: "/calls", icon: PhoneCall },
      { labelKey: "nav.transcripts", href: "/transcripts", icon: FileText },
      { labelKey: "nav.aiReviews", href: "/ai-reviews", icon: Bot },
    ],
  },
  {
    labelKey: "nav.settings",
    items: [
      { labelKey: "nav.customFields", href: "/settings/custom-fields", icon: DatabaseZap },
      { labelKey: "nav.appearance", href: "/settings/appearance", icon: Palette },
    ],
  },
];
