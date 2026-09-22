import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "../ui";
import { useLogout, useMe } from "../../hooks/useAuth";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-[length:var(--text-body-sm)] font-medium transition-colors duration-150 ${
    isActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
  }`;

export function NavBar() {
  const { data } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => navigate("/login"),
    });
  }

  return (
    <nav className="flex justify-between items-center px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center gap-6">
        <span className="text-[length:var(--text-body-sm)] font-semibold text-[var(--color-text)]">
          Nutrition Tracker
        </span>
        <div className="flex items-center gap-4">
          <NavLink to="/" end className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/plan" className={navLinkClass}>
            Plan
          </NavLink>
          <NavLink to="/coach" className={navLinkClass}>
            Coach
          </NavLink>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {data?.user && (
          <span className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
            {data.user.display_name}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout} loading={logout.isPending}>
          Log out
        </Button>
      </div>
    </nav>
  );
}
