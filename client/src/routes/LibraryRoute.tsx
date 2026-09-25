import { useState } from "react";
import { Tabs, TabPanel } from "../components/ui";
import { RecipesTab } from "../components/library/RecipesTab";
import { IngredientsTab } from "../components/library/IngredientsTab";

const TABS = [
  { id: "recipes", label: "Recipes" },
  { id: "ingredients", label: "Ingredients" },
];

export function LibraryRoute() {
  const [tab, setTab] = useState("recipes");

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-[length:var(--text-heading-lg)] font-semibold text-[var(--color-text)] mb-4">
        Library
      </h1>
      <Tabs items={TABS} value={tab} onChange={setTab} label="Library sections" />
      <TabPanel id="recipes" active={tab === "recipes"}>
        <RecipesTab />
      </TabPanel>
      <TabPanel id="ingredients" active={tab === "ingredients"}>
        <IngredientsTab />
      </TabPanel>
    </div>
  );
}
