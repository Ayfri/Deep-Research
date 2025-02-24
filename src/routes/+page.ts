import type { PageLoad } from './$types';
import { conversations } from '$lib/stores/conversations';
import { redirect } from '@sveltejs/kit';

export const load: PageLoad = ({ url }) => {
	const conversationId = url.searchParams.get('id');

	if (!conversationId) {
		const newId = conversations.createConversation('sonar-reasoning-pro');
		throw redirect(302, `/?id=${newId}`);
	}

	const conversation = conversations.getConversation(conversationId);
	if (!conversation) {
		const newId = conversations.createConversation('sonar-reasoning-pro');
		throw redirect(302, `/?id=${newId}`);
	}

	return {
		conversation
	};
};

export const ssr = false; 