
// await saveTextFile("scripts/test.js", script);
// const script = await loadTextFile("scripts/test.js");

// await saveJsonFile("settings/editor.json", settings);
// const settings = await loadJsonFile<EditorSettings>("settings/editor.json");

export async function loadTextFile(fn: string): Promise<string> {
  const res = await fetch(`/api/files?fn=${encodeURIComponent(fn)}`);

  if (!res.ok) {
    throw new Error(`Failed to load file: ${fn}`);
  }

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.message ?? `Failed to load file: ${fn}`);
  }

  return json.content;
}

export async function saveTextFile(fn: string, content: string): Promise<void> {
  const res = await fetch("/api/files", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fn, content }),
  });

  if (!res.ok) {
    throw new Error(`Failed to save file: ${fn}`);
  }

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.message ?? `Failed to save file: ${fn}`);
  }
}

export async function loadJsonFile<T>(fn: string): Promise<T> {
  const res = await fetch(`/api/files/json?fn=${encodeURIComponent(fn)}`);

  if (!res.ok) {
    throw new Error(`Failed to load JSON file: ${fn}`);
  }

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.message ?? `Failed to load JSON file: ${fn}`);
  }

  return json.data as T;
}

export async function saveJsonFile(fn: string, data: unknown): Promise<void> {
  const res = await fetch("/api/files/json", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fn, data }),
  });

  if (!res.ok) {
    throw new Error(`Failed to save JSON file: ${fn}`);
  }

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.message ?? `Failed to save JSON file: ${fn}`);
  }
}