import { Link } from "react-router-dom";
import { Badge, Button } from "../ui";
import type { RecipeWithArchived } from "../../api/recipes";

interface RecipeListRowProps {
  recipe: RecipeWithArchived;
  archivedRow?: boolean;
  onArchive?: () => void;
  archiving?: boolean;
  onRestore?: () => void;
  restoring?: boolean;
  onDelete?: () => void;
  deleting?: boolean;
  error?: string;
}

/** One row in Library's Recipes list — either the active-list shape
 *  (View/Edit/Archive) or the archived-list shape (Restore/Delete). */
export function RecipeListRow({
  recipe,
  archivedRow = false,
  onArchive,
  archiving,
  onRestore,
  restoring,
  onDelete,
  deleting,
  error,
}: RecipeListRowProps) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[length:var(--text-body-sm)] font-medium text-[var(--color-text)]">
          <span className="truncate">{recipe.title}</span>
          {archivedRow && <Badge variant="neutral">ARCHIVED</Badge>}
        </p>
        <p className="text-[length:var(--text-caption)] text-[var(--color-text-muted)]">
          {recipe.servings} serving{recipe.servings === 1 ? "" : "s"}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-[length:var(--text-caption)] text-[var(--color-error)]">
            {error}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        {!archivedRow && (
          <>
            <Link to={`/library/recipes/${recipe.id}`}>
              <Button variant="secondary" size="sm">
                View
              </Button>
            </Link>
            <Link to={`/library/recipes/${recipe.id}/edit`}>
              <Button variant="secondary" size="sm">
                Edit
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={onArchive} loading={archiving}>
              Archive
            </Button>
          </>
        )}
        {archivedRow && (
          <>
            <Button variant="secondary" size="sm" onClick={onRestore} loading={restoring}>
              Restore
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete} loading={deleting}>
              Delete
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
