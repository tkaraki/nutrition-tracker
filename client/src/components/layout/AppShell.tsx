import { Outlet } from "react-router-dom";
import { BottomTabBar } from "./BottomTabBar";
import { NavBar } from "./NavBar";

export function AppShell() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      {/* Bottom padding reserves space for the fixed mobile tab bar so content
          never sits underneath it. */}
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
}
