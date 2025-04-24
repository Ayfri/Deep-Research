import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const initialOpenaiApiKey = browser ? localStorage.getItem('openaiApiKey') || '' : '';
const initialPerplexityApiKey = browser ? localStorage.getItem('perplexityApiKey') || '' : '';

export const openaiApiKey = writable<string>(initialOpenaiApiKey);
export const perplexityApiKey = writable<string>(initialPerplexityApiKey);

// Update localStorage when the store changes (only in browser)
if (browser) {
	openaiApiKey.subscribe(value => {
		if (value) {
			localStorage.setItem('openaiApiKey', value);
		} else {
			localStorage.removeItem('openaiApiKey');
		}
	});

	perplexityApiKey.subscribe(value => {
		if (value) {
			localStorage.setItem('perplexityApiKey', value);
		} else {
			localStorage.removeItem('perplexityApiKey');
		}
	});
} 