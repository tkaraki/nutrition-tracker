import { useState } from "react";
import { Combobox } from "../ui";
import { useIngredients } from "../../hooks/useIngredients";
import { IngredientForm } from "./IngredientForm";
import type { Ingredient } from "../../api/types";

interface IngredientComboboxProps {
  value: string;
  isSelected: boolean;
  onSelect: (ingredient: Ingredient) => void;
  onClear: () => void;
  label?: string;
  error?: string;
}

/**
 * The `Combobox` primitive wired up for ingredient search, with the nested
 * "+ Create new ingredient" escape hatch (reuses this file's own
 * `IngredientForm`). Shared by `RecipeForm`'s ingredient lines and recipe
 * import's ingredient resolution.
 */
export function IngredientCombobox({
  value,
  isSelected,
  onSelect,
  onClear,
  label = "Ingredient",
  error,
}: IngredientComboboxProps) {
  const [query, setQuery] = useState("");
  const [showCreateNew, setShowCreateNew] = useState(false);
  const { data: results, isPending, isError } = useIngredients(query || undefined);

  function handleCreated(ingredient: Ingredient) {
    setShowCreateNew(false);
    onSelect(ingredient);
  }

  return (
    <div>
      <Combobox
        label={label}
        placeholder="Search ingredients..."
        value={value}
        onSearch={setQuery}
        onSelect={onSelect}
        onClear={onClear}
        items={results ?? []}
        isLoading={isPending}
        isError={isError}
        getKey={(i) => i.id}
        getLabel={(i) => i.name}
        isSelected={isSelected}
        onCreateNew={() => setShowCreateNew(true)}
        createNewLabel={() => `+ Create new ingredient`}
        error={error}
      />
      {showCreateNew && (
        <div className="mt-2">
          <IngredientForm mode="create" onSaved={handleCreated} onCancel={() => setShowCreateNew(false)} />
        </div>
      )}
    </div>
  );
}
