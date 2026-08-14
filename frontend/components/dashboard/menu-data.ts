import {
  LayoutDashboard,
  ClipboardList,
  Users2,
  Stethoscope,
  FileText,
  Pill,
  FlaskConical,
  Wallet,
  Receipt,
  Boxes,
  Database,
  CalendarClock,
  BarChart3,
  ShieldCheck,
  Settings,
  Link2,
  Ticket,
  type LucideIcon,
} from "lucide-react";

export type MenuItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  children?: MenuItem[];
};

export const menuData: MenuItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "Pelayanan & Antrean",
    icon: ClipboardList,
    children: [
      { label: "Antrian Awal", icon: Ticket, href: "/dashboard/antrian-awal" }, // ⬅ BARU, di atas Pendaftaran
      { label: "Pendaftaran", icon: Users2, href: "/dashboard/pendaftaran" },
      { label: "Antrian", icon: ClipboardList, href: "/dashboard/antrian" },
      { label: "Rawat Jalan", icon: Stethoscope, href: "/dashboard/rawat-jalan" },
    ],
  },
  {
    label: "Pelayanan Medis",
    icon: Stethoscope,
    children: [
      { label: "Rekam Medis", icon: FileText, href: "/dashboard/rekam-medis" },
      { label: "Pemeriksaan Dokter", icon: Stethoscope, href: "/dashboard/pemeriksaan" },
    ],
  },
  {
    label: "Penunjang Medis",
    icon: FlaskConical,
    children: [
      { label: "Farmasi", icon: Pill, href: "/dashboard/penunjang-medis/farmasi" },
      { label: "Laboratorium", icon: FlaskConical, href: "/dashboard/penunjang-medis/laboratorium" },
    ],
  },
  {
    label: "Kasir & Keuangan",
    icon: Wallet,
    children: [
      { label: "Kasir", icon: Receipt, href: "/dashboard/kasir-keuangan/kasir" },
      { label: "Keuangan", icon: Wallet, href: "/dashboard/kasir-keuangan/keuangan" },
    ],
  },
  {
    label: "Logistik & Operasional",
    icon: Boxes,
    children: [
      { label: "Inventori", icon: Boxes, href: "/dashboard/inventori" },
      { label: "Master Data", icon: Database, href: "/dashboard/master-data" },
      { label: "Jadwal Dokter", icon: CalendarClock, href: "/dashboard/jadwal-dokter" },
    ],
  },
  {
    label: "Sistem & Pelaporan",
    icon: ShieldCheck,
    children: [
      { label: "Laporan", icon: BarChart3, href: "/dashboard/laporan" },
      { label: "Manajemen User", icon: Users2, href: "/dashboard/user-management" },
      { label: "Pengaturan", icon: Settings, href: "/dashboard/pengaturan" },
      { label: "Integrasi & Audit Log", icon: Link2, href: "/dashboard/audit-log" },
    ],
  },
];