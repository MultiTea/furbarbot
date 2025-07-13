import { BotContext } from "../types/sessions.ts";
import { ENV } from "../middleware/config.ts";

/**
 * Sends a message to the admin's private chat
 * @param ctx Bot context
 * @param message Message to send
 * @param parseMode Parse mode for the message (default: 'HTML')
 */
export async function sendAdminMessage(
    ctx: BotContext,
    message: string,
    parseMode: 'HTML' | 'Markdown' | 'MarkdownV2' = 'HTML'
) {
    try {
        // Check if we have the admin chat ID
        if (!ENV.ADMIN_CHAT_ID) {
            console.error("ADMIN_CHAT_ID is not set in environment variables");
            return;
        }

        // Send the message to the admin's private chat
        await ctx.api.sendMessage(ENV.ADMIN_CHAT_ID, `👨‍💻 Admin Notification:\n\n${message}`, { 
            parse_mode: parseMode 
        });
    } catch (error) {
        console.error("Error sending admin message:", error);
        
        // Fallback to console if message sending fails
        console.log("Admin message content:", message);
    }
}

/**
 * Checks if the current user is an admin
 * @param ctx Bot context
 * @returns Promise<boolean> True if user is admin, false otherwise
 */
export async function isAdmin(ctx: BotContext): Promise<boolean> {
    try {
        if (!ctx.chat?.id || !ctx.from?.id) return false;
        
        const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
        return ['creator', 'administrator'].includes(member.status);
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}

/**
 * Middleware to ensure only admins can use certain commands
 */
export const adminOnly = async (ctx: BotContext, next: () => Promise<void>) => {
    if (await isAdmin(ctx)) {
        await next();
    } else {
        await ctx.reply("❌ This command is only available to administrators.");
    }
};
