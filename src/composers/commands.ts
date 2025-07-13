// src/composers/commands.ts
import { Composer } from "grammY";
import { BotContext, PollData } from "../types/sessions.ts";
import { ENV } from "../middleware/config.ts";

export const commandManager = new Composer<BotContext>();

commandManager.command("lol", (ctx) => {
    const user = ctx.from;
    ctx.reply(`${ENV.ADMIN_CHAT_ID} send for ${user?.id}`);
    console.log(`${ENV.ADMIN_CHAT_ID}`);
});

// TEST COMMAND
const POLL_EXPIRATION = 30 * 1000;
commandManager.command("test", async (ctx) => {
    const user = ctx.from;
    const userId = user?.id as number;
    const userHandle = user?.username as string;
    const chatId = ctx.chat?.id;

    if (!chatId) {
        console.error("Chat ID is undefined");
        return;
    }

    // Ensure the session exists and the chatId is set
    if (ctx.session) {
        ctx.session.chatId = chatId;
    } else {
        console.error("Session is undefined");
        return;
    }

    // Constition du sondage
    const question =
        `🆕 Nouvelle demande → ${user?.first_name} souhaite se joindre à nous ! Souhaitez-vous l'intégrer à l'événement ?`;
    const pollOptions = [
        "✅ Oui, pas de soucis !",
        "🚫 Non, je ne souhaite pas",
        "❔ Ne connait pas / se prononce pas",
    ];

    // Constitution du lien de présentation
    const userLink = `https://t.me/${user?.username || user?.id}`;
    const specialChar = "\u2060"; // Utiliser le caractère spécial
    const message = `[${specialChar}](${userLink})`;

    // Envoi du sondage et lien de présentation dans le groupe
    // @ts-ignore (Const can be applied)
    const pollMessage = await ctx.api.sendPoll(chatId, question, pollOptions, {
        is_anonymous: true,
    });

    const currentTime = Date.now();
    const newPollData: PollData = {
        userId: userId,
        chatId: chatId,
        handle: userHandle,
        pollId: pollMessage.poll.id,
        messageId: pollMessage.message_id,
        timestamp: currentTime,
        expirationTime: currentTime + POLL_EXPIRATION,
    };

    await addToOpenPolls(ctx, newPollData);

    await ctx.api.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        link_preview_options: { is_disabled: false },
    });
});

async function addToOpenPolls(ctx: BotContext, pollData: PollData) {
    const openPolls = ctx.db.collection("openPolls");
    await openPolls.insertOne(pollData);
    console.log(`Poll ID ${pollData.pollId} added to openPolls collection.`);
}