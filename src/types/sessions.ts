// src/types/sessions.ts
import { BaseContext } from "../middleware/dbAcess.ts";

// Define the base session data
export interface BaseSessionData {
    chatId: number;
}

// Define the command session data
export interface CommandSessionData extends BaseSessionData {
    isAdmin?: boolean;
}

// Define the poll data structure
export interface PollData {
    userId: number;
    handle: string;
    pollId: string;
    messageId: number;
    chatId: number;
    timestamp: number;
    expirationTime: number;
    results?: PollResults;
}

// Define the poll results structure
export interface PollResults {
    totalVoters: number;
    options: Array<{
        text: string;
        voterCount: number;
    }>;
}

// Define the poll session data
export interface PollSessionData extends BaseSessionData {
    polls: PollData[];
}

// Combine all session data types
export type AllSessionData = CommandSessionData & PollSessionData;

// Define the bot context type
export type BotContext = BaseContext & {
    session: AllSessionData;
};
