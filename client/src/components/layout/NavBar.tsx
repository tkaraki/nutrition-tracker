import { BookOpen, Calendar, Home, Menu, Pill, Sparkles, Target, X } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui";
import { useLogout, useMe } from "../../hooks/useAuth";

export const PRIMARY_NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: Home, end: true },
  { to: "/plan", label: "Plan", icon: Calendar, end: false },
  { to: "/supplements", label: "Supplements", icon: Pill, end: false },
  { to: "/library", label: "Library", icon: BookOpen, end: false },
  { to: "/coach", label: "Coach", icon: Sparkles, end: false },
] as const;

const desktopNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-[length:var(--text-body-sm)] font-medium transition-colors duration-150 ${
    isActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
  }`;

export function NavBar() {
  const { data } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => navigate("/login"),
    });
  }

  useEffect(() => {
    if (!menuOpen) return;
    const firstLink = menuRef.current?.querySelector<HTMLElement>("a, button");
    firstLink?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    }
    function handlePointerDown(e: PointerEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [menuOpen]);

  return (
    <nav className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="text-[length:var(--text-body-sm)] font-semibold text-[var(--color-text)]">
            Nutrition Tracker
          </span>
          {/* Desktop primary nav */}
          <div className="hidden md:flex items-center gap-4">
            {PRIMARY_NAV_ITEMS.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={desktopNavLinkClass}>
                {label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Desktop account/targets cluster */}
        <div className="hidden md:flex items-center gap-4">
          <NavLink to="/targets" className={desktopNavLinkClass}>
            <span className="inline-flex items-center gap-1.5">
              <Target size={16} aria-hidden="true" />
              Targets
            </span>
          </NavLink>
          {data?.user && (
            <span className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              {data.user.display_name}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout} loading={logout.isPending}>
            Log out
          </Button>
        </div>

        {/* Mobile hamburger trigger */}
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-overflow-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]"
        >
          {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile overflow menu: Targets + account */}
      {menuOpen && (
        <div
          ref={menuRef}
          id="mobile-overflow-menu"
          className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 space-y-1"
        >
          <NavLink
            to="/targets"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 min-h-11 rounded-[var(--radius-sm)] px-2 text-[length:var(--text-body-sm)] font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]"
          >
            <Target size={18} aria-hidden="true" />
            Targets
          </NavLink>
          {data?.user && (
            <p className="px-2 py-2 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
              {data.user.display_name}
            </p>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout} loading={logout.isPending} className="w-full justify-start">
            Log out
          </Button>
        </div>
      )}
    </nav>
  );
}
