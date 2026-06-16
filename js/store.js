// Namespaced localStorage wrapper. All app data lives under the "ll:" prefix.
const PREFIX = "ll:";

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? structuredClone(fallback) : JSON.parse(raw);
  } catch {
    return structuredClone(fallback);
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn("Could not save", key, e);
  }
  return value;
}

// Read, mutate via fn, write back. Returns the new value.
export function update(key, fallback, fn) {
  const next = fn(load(key, fallback));
  return save(key, next);
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key);
}

// Short unique-ish id for list items.
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
