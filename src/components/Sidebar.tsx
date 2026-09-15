"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  ReceiptText,
  Truck,
  Users,
  Wallet,
  FolderOpen,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";

const navItems = [
  // {
  //   label: "Dashboard",
  //   href: "/dashboard",
  //   icon: LayoutDashboard,
  // },
  {
    label: "Obras",
    href: "/obras",
    icon: Building2,
  },
  {
    label: "Gastos",
    href: "/gastos",
    icon: ReceiptText,
  },
  {
    label: "Proveedores",
    href: "/proveedores",
    icon: Truck,
  },
  {
    label: "Empleados",
    href: "/empleados",
    icon: Users,
  },
  {
    label: "Pagos",
    href: "/pagos",
    icon: Wallet,
  },
  {
    label: "Archivos y documentos",
    href: "/documentos",
    icon: FolderOpen,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-6 py-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Gestión de Obras
        </h1>

        <p className="mt-1 text-xs text-gray-500">Administración</p>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;

          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon size={19} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <LogoutButton />
      </div>
    </aside>
  );
}
