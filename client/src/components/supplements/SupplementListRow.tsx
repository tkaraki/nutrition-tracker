import { Button, Card } from "../ui";
import type { Supplement } from "../../api/supplements";

interface SupplementListRowProps {
  supplement: Supplement;
  onEdit: () => void;
  onDelete: () => void;
}

/** One row in the Supplement list tab — mirrors Library's ingredient-list
 * row shape (name + nutrient summary caption, Edit/Delete ghost buttons). */
export function SupplementListRow({ supplement, onEdit, onDelete }: SupplementListRowProps) {
  const title = supplement.brand ? `${supplement.name} (${supplement.brand})` : supplement.name;
  const summary = `${supplement.serving_unit} per dose · ${supplement.calories_kcal} kcal, ${supplement.protein_g} g protein, ${supplement.carbs_g} g carbs, ${supplement.fat_g} g fat`;

  return (
    <Card padding="sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[length:var(--text-heading-sm)] font-semibold text-[var(--color-text)]">{title}</h3>
          <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">{summary}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
