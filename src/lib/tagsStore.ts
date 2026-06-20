import * as SecureStore from "expo-secure-store";

const KEY = "known_tags";

export async function getKnownTags(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function saveKnownTags(tags: string[]): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify([...new Set(tags)].sort()));
}

export async function addKnownTag(tag: string): Promise<void> {
  const existing = await getKnownTags();
  if (!existing.includes(tag)) await saveKnownTags([...existing, tag]);
}

export async function removeKnownTag(tag: string): Promise<void> {
  const existing = await getKnownTags();
  await saveKnownTags(existing.filter(t => t !== tag));
}

export async function renameKnownTag(oldTag: string, newTag: string): Promise<void> {
  const existing = await getKnownTags();
  await saveKnownTags(existing.map(t => t === oldTag ? newTag : t));
}
