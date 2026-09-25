import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { RequireAuth } from "./components/layout/RequireAuth";
import { CoachRoute } from "./routes/CoachRoute";
import { DashboardRoute } from "./routes/DashboardRoute";
import { LibraryRoute } from "./routes/LibraryRoute";
import { LoginRoute } from "./routes/LoginRoute";
import { PlannerRoute } from "./routes/PlannerRoute";
import { RecipeDetailRoute } from "./routes/RecipeDetailRoute";
import { RecipeEditRoute } from "./routes/RecipeEditRoute";
import { RecipeImportRoute } from "./routes/RecipeImportRoute";
import { RegisterRoute } from "./routes/RegisterRoute";
import { SupplementsRoute } from "./routes/SupplementsRoute";
import { TargetsRoute } from "./routes/TargetsRoute";

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
          <Route path="/supplements" element={<SupplementsRoute />} />
          <Route path="/library" element={<LibraryRoute />} />
          <Route path="/library/import" element={<RecipeImportRoute />} />
          <Route path="/library/recipes/:id" element={<RecipeDetailRoute />} />
          <Route path="/library/recipes/:id/edit" element={<RecipeEditRoute />} />
          <Route path="/coach" element={<CoachRoute />} />
          <Route path="/targets" element={<TargetsRoute />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
