import { useState } from "react";
import type { FormEvent } from "react";
import { Button, Field, Textarea } from "../ui";
import type { RecipeImportInput } from "../../api/recipeImports";

interface ImportSourceFormProps {
  onSubmit: (input: RecipeImportInput) => void;
  /** True while a request is in flight or a cooldown/daily limit disables the CTA. */
  submitDisabled: boolean;
  loading: boolean;
}

function isLikelyUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Step 1 — source input. Two-button segmented control (not the `Tabs`
 * primitive — binary choice, per the visual spec) toggling between a URL
 * `Field` and a text `Textarea`, matching the API's `{source:"url"|"text"}`
 * discriminated union exactly.
 */
export function ImportSourceForm({ onSubmit, submitDisabled, loading }: ImportSourceFormProps) {
  const [mode, setMode] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === "url") {
      const trimmed = url.trim();
      if (!isLikelyUrl(trimmed)) {
        setUrlError("Enter a valid URL (including https://).");
        return;
      }
      setUrlError(null);
      onSubmit({ source: "url", url: trimmed });
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit({ source: "text", text: trimmed });
  }

  const canSubmit = mode === "url" ? url.trim() !== "" : text.trim() !== "";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2" role="group" aria-label="Import source">
        <Button
          type="button"
          variant={mode === "url" ? "primary" : "secondary"}
          onClick={() => setMode("url")}
          aria-pressed={mode === "url"}
        >
          Paste a URL
        </Button>
        <Button
          type="button"
          variant={mode === "text" ? "primary" : "secondary"}
          onClick={() => setMode("text")}
          aria-pressed={mode === "text"}
        >
          Paste recipe text
        </Button>
      </div>

      {mode === "url" ? (
        <Field
          label="Recipe URL"
          type="url"
          placeholder="https://example.com/recipe-of-the-day"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (urlError) setUrlError(null);
          }}
          error={urlError ?? undefined}
          required
          autoFocus
        />
      ) : (
        <Textarea
          label="Recipe text"
          rows={8}
          placeholder="Paste the recipe text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          autoFocus
        />
      )}

      <Button
        type="submit"
        size="lg"
        loading={loading}
        disabled={submitDisabled || !canSubmit}
        className="w-full sm:w-auto"
      >
        Import
      </Button>
    </form>
  );
}
