import { writable } from 'svelte/store';

export function persistent<T>(key: string, startValue: T) {
	if (typeof localStorage === 'undefined') {
		return writable<T>(startValue);
	}

	const keyName = `deep-research-${key}`;

	const storedValueStr = localStorage.getItem(keyName);
	let initialValue = startValue;

	if (storedValueStr) {
		try {
			initialValue = JSON.parse(storedValueStr);
		} catch (e) {
			// Ignore JSON parse errors and use startValue
		}
	}

	const store = writable<T>(initialValue);
	store.subscribe((value) => localStorage.setItem(keyName, JSON.stringify(value)));

	return store;
}
