// src/bot.ts
import "https://deno.land/std@0.154.0/dotenv/load.ts";
import { Bot } from "grammY";
import { BotContext } from "./types/sessions.ts";
import { connectToMongo, dbMiddleware } from "./middleware/dbAcess.ts";
import { adminMiddleware } from "./middleware/isAdmin.ts";
import { pollManager } from "./composers/pollManager.ts";
import { commandManager } from "./composers/commands.ts";
import { testSetTimeout } from "./composers/test.ts";

// Load environment variables
const BOT_TOKEN = Deno.env.get("BOT_TOKEN") || "";
const MONGO_URI = Deno.env.get("MONGODB_URI") || "";
const MONGO_DB = Deno.env.get("MONGODB_DB") || "";

async function bootstrap() {
    await connectToMongo(MONGO_URI, MONGO_DB);
    const bot = new Bot<BotContext>(BOT_TOKEN);
    bot.use(dbMiddleware);
    bot.use(commandManager);
    bot.use(adminMiddleware);
    bot.use(pollManager);
    bot.use(testSetTimeout);
    bot.catch((err) => {
        console.error("Error in bot:", err);
    });
    bot.start();
}

bootstrap();