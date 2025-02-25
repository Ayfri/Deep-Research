import { writable } from "svelte/store";

export function persistent<T>(key: string, startValue: T) {
	if (typeof localStorage === "undefined") {
		return writable<T>(startValue);
	}

	const storedValueStr = localStorage.getItem(key);
	const store = writable<T>(storedValueStr ? JSON.parse(storedValueStr) : startValue);
	store.subscribe((value) => localStorage.setItem(key, JSON.stringify(value)));

	return store;
}
