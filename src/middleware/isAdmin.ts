// adminMiddleware.ts
import { MiddlewareFn } from "grammY";
import { BotContext } from "../types/sessions.ts";

// Load environment variables directly using Deno.env
const ADMIN_IDS =
    Deno.env.get("ADMIN_CHAT_ID")?.split(",").map((id) =>
        parseInt(id.trim(), 10)
    ) || [];

export const adminMiddleware: MiddlewareFn<BotContext> = async (
    ctx,
    next,
) => {
    if (ctx.session && ctx.from) {
        ctx.session.isAdmin = ADMIN_IDS.includes(ctx.from?.id || 0);
    }
    await next();
};
