import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { RequireAuth } from "./components/layout/RequireAuth";
import { CoachRoute } from "./routes/CoachRoute";
import { DashboardRoute } from "./routes/DashboardRoute";
import { LoginRoute } from "./routes/LoginRoute";
import { PlannerRoute } from "./routes/PlannerRoute";
import { RegisterRoute } from "./routes/RegisterRoute";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/register" element={<RegisterRoute />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<DashboardRoute />} />
          <Route path="/plan" element={<PlannerRoute />} />
          <Route path="/coach" element={<CoachRoute />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
