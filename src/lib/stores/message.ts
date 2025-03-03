import { persistent } from "./persistent";

export const draftMessage = persistent<string>('draftMessage', '');
