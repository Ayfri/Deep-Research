import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';
import type { ChatMessage } from '$lib/types';
import { isDeepResearch } from '$lib/stores/model';

export interface Conversation {
	id: string;
	name?: string;
	messages: ChatMessage[];
	model: string;
	isDeepResearch: boolean;
	lastUpdated: number;
}

function createConversationsStore() {
	const { subscribe, set, update } = writable<Conversation[]>([]);

	// Load conversations from localStorage on initialization
	const loadFromStorage = () => {
		if (!browser) return;
		const stored = localStorage.getItem('conversations');
		if (stored) {
			set(JSON.parse(stored));
		}
	};

	// Save conversations to localStorage
	const saveToStorage = (conversations: Conversation[]) => {
		if (!browser) return;
		localStorage.setItem('conversations', JSON.stringify(conversations));
	};

	return {
		subscribe,
		createConversation: (model: string) => {
			if (!browser) return '';
			
			const id = crypto.randomUUID();
			const conversation: Conversation = {
				id,
				messages: [],
				model,
				isDeepResearch: get(isDeepResearch),
				lastUpdated: Date.now()
			};

			update(conversations => {
				const newConversations = [conversation, ...conversations];
				saveToStorage(newConversations);
				return newConversations;
			});

			return id;
		},
		updateConversation: (id: string, messages: ChatMessage[], model: string, isDeepResearch: boolean) => {
			if (!browser) return;
			
			update(conversations => {
				const newConversations = conversations.map(conv =>
					conv.id === id
						? { ...conv, messages, model, isDeepResearch, lastUpdated: Date.now() }
						: conv
				);
				saveToStorage(newConversations);
				return newConversations;
			});
		},
		updateConversationName: (id: string, name: string) => {
			if (!browser) return;
			
			update(conversations => {
				const newConversations = conversations.map(conv =>
					conv.id === id
						? { ...conv, name, lastUpdated: Date.now() }
						: conv
				);
				saveToStorage(newConversations);
				return newConversations;
			});
		},
		deleteConversation: (id: string) => {
			if (!browser) return;
			
			update(conversations => {
				const newConversations = conversations.filter(conv => conv.id !== id);
				saveToStorage(newConversations);
				return newConversations;
			});
		},
		getConversation: (id: string) => {
			if (!browser) return null;
			
			const stored = localStorage.getItem('conversations');
			if (!stored) return null;
			
			const conversations = JSON.parse(stored) as Conversation[];
			return conversations.find(conv => conv.id === id) || null;
		},
		init: loadFromStorage
	};
}

export const conversations = createConversationsStore(); 
