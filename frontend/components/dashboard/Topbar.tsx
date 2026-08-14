"use client";

import { useEffect, useState } from "react";
import { Menu, Bell, User } from "lucide-react";

export default function Topbar({
  onToggleSidebar,
}: {
  onToggleSidebar: () => void;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const formatted = now
    ? now.toLocaleString("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-md p-2 hover:bg-gray-100"
        >
          <Menu size={20} />
        </button>
        <span className="text-lg font-bold text-gray-800">Sistem Klinik</span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span suppressHydrationWarning>{formatted}</span>
        <button className="rounded-full p-2 hover:bg-gray-100">
          <Bell size={18} />
        </button>
        <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <User size={16} />
          </div>
          <span className="font-medium">Superadmin</span>
        </div>
      </div>
    </header>
  );
}