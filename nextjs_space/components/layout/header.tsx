"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Bell, Search, ChevronDown, Moon, Sun } from "lucide-react";
import Link from "next/link";

export default function Header() {
  const { data: session } = useSession() || {};
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch("/api/notifications?unread=true")
      .then((r) => r.json())
      .then((d) => setUnread(d?.count ?? 0))
      .catch(() => {});
  }, []);

  const userName = session?.user?.name?.split(" ")[0] ?? "Usuário";

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-6 py-3 border-b bg-white dark:bg-gray-900/80 dark:border-gray-700/50 backdrop-blur-sm">
      {/* Spacer for mobile hamburger */}
      <div className="w-10 md:hidden" />

      {/* Search */}
      <div className="relative flex-1 max-w-xs hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Pesquisar..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
          style={{ '--tw-ring-color': '#10b981' } as any}
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-3 ml-auto">
        {/* Dark mode toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {theme === 'dark'
              ? <Sun className="w-5 h-5 text-amber-400" />
              : <Moon className="w-5 h-5 text-gray-500" />
            }
          </button>
        )}

        <Link href="/notificacoes" className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center" style={{ background: '#10b981', fontSize: '9px' }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>

        <Link href="/configuracoes" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ background: '#10b981' }}>
            {userName[0]?.toUpperCase() ?? 'U'}
          </div>
          <ChevronDown className="w-3 h-3 text-gray-400 hidden sm:block" />
        </Link>
      </div>
    </header>
  );
}
