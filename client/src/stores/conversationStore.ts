import { create } from 'zustand';
import type { Conversation as ServerConversation, Message as ServerMessage } from '../lib/types';

// Re-export shared types
export type { ServerConversation, ServerMessage };

/// UI-facing message (differs from server Message: uses string id, structured metadata)
export interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    sql_queries?: string[];
    data_pool_ids?: number[];
  };
  timestamp: string;
}

/// UI-facing conversation with messages inlined
export interface UIConversation {
  id: number;
  title: string;
  messages: UIMessage[];
  created_at: string;
}

interface ConversationStore {
  conversations: UIConversation[];
  activeId: number | null;
  streaming: boolean;
  setConversations: (convs: UIConversation[]) => void;
  addConversation: (conv: UIConversation) => void;
  setActive: (id: number | null) => void;
  addMessage: (convId: number, message: UIMessage) => void;
  setStreaming: (streaming: boolean) => void;
  getActive: () => UIConversation | undefined;
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  conversations: [],
  activeId: null,
  streaming: false,
  setConversations: (conversations) => set({ conversations }),
  addConversation: (conv) =>
    set((s) => ({ conversations: [...s.conversations, conv] })),
  setActive: (id) => set({ activeId: id }),
  addMessage: (convId, message) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId
          ? { ...c, messages: [...c.messages, message] }
          : c
      ),
    })),
  setStreaming: (streaming) => set({ streaming }),
  getActive: () => {
    const { conversations, activeId } = get();
    return conversations.find((c) => c.id === activeId);
  },
}));
