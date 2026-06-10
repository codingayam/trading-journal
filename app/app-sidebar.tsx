import { LogoutButton } from "@/app/logout-button";

type AppSidebarProps = {
  current: "Dashboard" | "Trades" | "Setups" | "Stats" | "Calendar";
  displayName: string;
};

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Trades", href: "/#trades" },
  { label: "Setups", href: "/#setups" },
  { label: "Stats", href: "/stats" },
  { label: "Calendar", href: "/#calendar" },
] as const;

export function AppSidebar({ current, displayName }: AppSidebarProps) {
  return (
    <aside className="sidebar" aria-label="Product navigation">
      <div className="brand-lockup" aria-label="Trading Journal">
        <span className="brand-mark">TJ</span>
        <div>
          <strong>Trading Journal</strong>
          <span>{displayName}</span>
        </div>
      </div>

      <nav className="side-nav">
        {navItems.map((item) => (
          <a
            aria-current={item.label === current ? "page" : undefined}
            href={item.href}
            key={item.label}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="sidebar-footer">
        <LogoutButton />
      </div>
    </aside>
  );
}
