"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { menuData, type MenuItem } from "./menu-data";

export default function Sidebar({ open }: { open: boolean }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>([]);

  const toggle = (label: string) =>
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );

  const renderItem = (item: MenuItem, depth = 0) => {
    const Icon = item.icon;
    const isActive = item.href && pathname === item.href;
    const isExpanded = expanded.includes(item.label);

    if (item.children) {
      return (
        <div key={item.label}>
          <button
            onClick={() => toggle(item.label)}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <span className="flex items-center gap-3">
              <Icon size={18} />
              {open && <span>{item.label}</span>}
            </span>
            {open && (
              <ChevronDown
                size={16}
                className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
              />
            )}
          </button>
          {open && isExpanded && (
            <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-gray-200 pl-3">
              {item.children.map((child) => renderItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href ?? "#"}
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
          isActive
            ? "border border-emerald-500 text-emerald-600"
            : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
        }`}
      >
        <Icon size={18} />
        {open && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={`h-screen shrink-0 overflow-y-auto border-r border-gray-200 bg-white transition-all duration-200 ${
        open ? "w-64" : "w-16"
      }`}
    >
      <nav className="flex flex-col gap-1 p-3">
        {open && (
          <p className="mb-1 mt-2 px-3 text-xs font-semibold uppercase text-gray-400">
            Menu
          </p>
        )}
        {menuData.map((item) => renderItem(item))}
      </nav>
    </aside>
  );
}