"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Eye, TrendingUp, TrendingDown, CreditCard,
  Target, Heart, BarChart3, Bot,
  Bell, Settings, Shield, LogOut, ChevronLeft, ChevronRight,
  Wallet, Menu, X
} from "lucide-react";

const navItems = [
  {
    section: "PRINCIPAL",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/visao-financeira", label: "Visão Financeira", icon: Eye },
      { href: "/receitas", label: "Receitas", icon: TrendingUp },
      { href: "/despesas", label: "Despesas", icon: TrendingDown },
      { href: "/dividas", label: "Dívidas", icon: CreditCard },

      { href: "/metas", label: "Metas", icon: Target },
    ],
  },
  {
    section: "ANÁLISE",
    items: [
      { href: "/saude-financeira", label: "Saúde Financeira", icon: Heart },
      { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
      { href: "/consultor-ia", label: "Consultor IA", icon: Bot },
    ],
  },
  {
    section: "SISTEMA",
    items: [
      { href: "/notificacoes", label: "Notificações", icon: Bell },
      { href: "/configuracoes", label: "Configurações", icon: Settings },
      { href: "/seguranca", label: "Segurança", icon: Shield },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#10b981' }}>
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">Saldo Inteligente</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Finanças Pessoais Inteligentes</p>
            </div>
          </div>
        )}
        {collapsed && !isMobile && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto" style={{ background: '#10b981' }}>
            <Wallet className="w-4 h-4 text-white" />
          </div>
        )}
        {isMobile ? (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-md hover:bg-white/10 transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <X className="w-5 h-5" />
          </button>
        ) : !collapsed ? (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-md hover:bg-white/10 transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {/* Collapse expand button (desktop only) */}
      {collapsed && !isMobile && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-3 p-1.5 rounded-md hover:bg-white/10 transition-colors"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 scrollbar-none">
        {navItems.map((group) => (
          <div key={group.section} className="mb-4">
            {(!collapsed || isMobile) && (
              <p className="px-3 mb-2 text-xs font-semibold tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {group.section}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={(collapsed && !isMobile) ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 mb-0.5 ${
                    active ? 'text-white' : 'hover:bg-white/8'
                  }`}
                  style={{
                    background: active ? '#10b981' : 'transparent',
                    color: active ? 'white' : 'rgba(255,255,255,0.65)',
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-red-500/20"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {(!collapsed || isMobile) && <span>Sair</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 p-2 rounded-lg md:hidden"
        style={{ background: '#0f172a' }}
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col md:hidden transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: '#0f172a', width: '260px' }}
      >
        {sidebarContent(true)}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 z-30"
        style={{
          background: '#0f172a',
          width: collapsed ? '72px' : '240px',
          minWidth: collapsed ? '72px' : '240px',
          flexShrink: 0,
        }}
      >
        {sidebarContent(false)}
      </aside>
    </>
  );
}
