"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  ReceiptText,
  Truck,
  Users,
  Wallet,
  FolderOpen,
  Menu,
  X,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";

const navItems = [
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

  const [menuOpen, setMenuOpen] = useState(false);

  // Cierra el menú automáticamente cuando cambia la ruta.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Evita que se pueda scrollear el contenido de atrás
  // mientras el menú mobile está abierto.
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      {/* HEADER MOBILE */}
      <header className="fixed top-0 left-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Gestión de Obras
          </h1>

          <p className="text-xs text-gray-500">Administración</p>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 transition hover:bg-gray-100"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* OVERLAY MOBILE */}
      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 md:hidden ${
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* SIDEBAR */}
      <aside
        className={`
          fixed top-0 left-0 z-50 flex h-dvh w-72 flex-col
          border-r border-gray-200 bg-white
          transition-transform duration-300 ease-in-out

          ${menuOpen ? "translate-x-0" : "-translate-x-full"}

          md:static md:h-screen md:w-64 md:translate-x-0
        `}
      >
        {/* HEADER SIDEBAR */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Gestión de Obras
            </h1>

            <p className="mt-1 text-xs text-gray-500">Administración</p>
          </div>

          {/* CERRAR - MOBILE */}
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 md:hidden"
          >
            <X size={22} />
          </button>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon size={19} className="shrink-0" />

                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* LOGOUT */}
        <div className="border-t border-gray-200 p-4">
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
