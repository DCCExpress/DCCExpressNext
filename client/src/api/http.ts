import { Loco, SingleScriptFile } from "../../../common/src/types";
import { BaseElement } from "../models/editor/core/BaseElement";
import { Layout } from "../models/editor/core/Layout";

import { ELEMENT_TYPES, ElementType, ITrackLayoutFile } from "../models/editor/types/EditorTypes";


export async function getLocos(): Promise<Loco[]> {
  const response = await fetch("/api/locos");

  if (!response.ok) {
    throw new Error("Nem sikerült lekérni a mozdonyokat.");
  }

  return response.json();
}

export async function saveLocos(locos: Loco[]): Promise<void> {
  const response = await fetch("/api/locos", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(locos),
  });

  if (!response.ok) {
    throw new Error("Nem sikerült elmenteni a mozdonyokat.");
  }
}


export type LayoutElementDto = {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  rotation?: number;
  width?: number;
  height?: number;
};

export async function getLayout(): Promise<Layout> {
  const response = await fetch("/api/layout");

  if (!response.ok) {
    throw new Error("Nem sikerült betölteni a pályát.");
  }

  return response.json();
}

export async function saveLayout(elements: Layout): Promise<void> {
  const response = await fetch("/api/layout", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(elements),
  });

  if (!response.ok) {
    throw new Error("Nem sikerült elmenteni a pályát.");
  }
}




export async function getScript(): Promise<SingleScriptFile> {
  const res = await fetch("/api/script");

  if (!res.ok) {
    throw new Error("Failed to load script");
  }

  return await res.json();
}

export async function saveScript(content: string): Promise<SingleScriptFile> {
  const res = await fetch("/api/script", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to save script");
  }

  return await res.json();
}