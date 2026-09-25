import { useState } from "react";
import { Tabs, TabPanel } from "../components/ui";
import { TodayTab } from "../components/supplements/TodayTab";
import { RoutineTab } from "../components/supplements/RoutineTab";
import { SupplementListTab } from "../components/supplements/SupplementListTab";
import type { TabItem } from "../components/ui";

const TABS: TabItem[] = [
  { id: "today", label: "Today" },
  { id: "routine", label: "Routine" },
  { id: "list", label: "Supplement list" },
];

// Container width matches PlannerRoute.tsx's own wrapper classes verbatim
// (per the UI spec's explicit instruction to reuse Planner's actual classes
// for consistency, rather than reinventing/guessing a width).
export function SupplementsRoute() {
  const [tab, setTab] = useState("today");

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <h1 className="text-[length:var(--text-heading-lg)] font-semibold text-[var(--color-text)]">Supplements</h1>

      <Tabs items={TABS} value={tab} onChange={setTab} label="Supplements sections" />

      <TabPanel id="today" active={tab === "today"}>
        <TodayTab />
      </TabPanel>
      <TabPanel id="routine" active={tab === "routine"}>
        <RoutineTab />
      </TabPanel>
      <TabPanel id="list" active={tab === "list"}>
        <SupplementListTab />
      </TabPanel>
    </div>
  );
}
