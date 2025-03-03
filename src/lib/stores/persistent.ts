import { writable } from "svelte/store";

export function persistent<T>(key: string, startValue: T) {
	if (typeof localStorage === "undefined") {
		return writable<T>(startValue);
	}

	const keyName = `deep-research-${key}`;

	const storedValueStr = localStorage.getItem(keyName);
	const store = writable<T>(storedValueStr ? JSON.parse(storedValueStr) : startValue);
	store.subscribe((value) => localStorage.setItem(keyName, JSON.stringify(value)));

	return store;
}
