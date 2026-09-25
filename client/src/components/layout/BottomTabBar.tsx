import { NavLink } from "react-router-dom";
import { PRIMARY_NAV_ITEMS } from "./NavBar";

/** Fixed mobile bottom tab bar — 5 primary destinations, icon + 1-word
 * label, 44px+ tap targets, safe-area padding for iOS home indicator. */
export function BottomTabBar() {
  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex">
        {PRIMARY_NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-0.5 min-h-11 border-t-2 py-2 text-[length:var(--text-caption)] font-medium transition-colors duration-150 ${
                isActive
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-muted)]"
              }`
            }
          >
            <Icon size={20} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
