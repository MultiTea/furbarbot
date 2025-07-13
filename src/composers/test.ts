import { Composer } from "grammY";
import { BotContext } from "../types/sessions.ts";

export const testSetTimeout = new Composer<BotContext>();

testSetTimeout.command("testtest", (ctx) => {
    setInterval(() => {
        ctx.reply(`5 seconds passed`);
    }, 5000);
    console.log(`5 seconds passed test launched`);
});