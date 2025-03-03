import { persistent } from '$lib/stores/persistent';
import type { Model } from '$lib/types';

export const model = persistent<Model | undefined>('model', undefined);
export const isDeepResearch = persistent('isDeepResearch', false);
