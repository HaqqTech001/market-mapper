export const CHAT_MAX_ATTACHMENT_BYTES = 1610612736; // 1.5 GiB
export const CHAT_MAX_ATTACHMENT_LABEL = '1.5 GB';

export class ChatMediaValidationError extends Error {
  constructor(public readonly userMessage:string){super(userMessage);this.name='ChatMediaValidationError'}
}

export function validateChatAttachmentSize(size?:number){
  if(typeof size==='number' && size>CHAT_MAX_ATTACHMENT_BYTES){
    throw new ChatMediaValidationError(`This file is larger than the ${CHAT_MAX_ATTACHMENT_LABEL} upload limit. Choose a smaller file.`);
  }
}

export function chatUserMessage(error:unknown, fallback='Something went wrong. Please try again.'):string{
  if(error instanceof ChatMediaValidationError)return error.userMessage;
  const raw=error instanceof Error?error.message:String(error??'');
  const text=raw.toLowerCase();
  if(text.includes('network')||text.includes('fetch')||text.includes('offline'))return 'You appear to be offline. Your chat is still available on this device.';
  if(text.includes('permission')||text.includes('not authorized')||text.includes('row-level security')||text.includes('rls'))return 'You do not have permission to do that in this chat.';
  if(text.includes('storage')||text.includes('upload'))return 'The media could not be uploaded. Keep it on this device and try again when your connection is stable.';
  if(text.includes('too large')||text.includes('payload'))return `That file is too large. The maximum attachment size is ${CHAT_MAX_ATTACHMENT_LABEL}.`;
  return fallback;
}
