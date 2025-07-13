// pollManager.ts
import { Composer } from "grammY";
import { BotContext, PollData, PollResults } from "../types/sessions.ts";

// Constants
const POLL_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours

export const pollManager = new Composer<BotContext>();

pollManager.on("chat_join_request", async (ctx) => {
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

    // Check if there's already an active or closed poll for this user in this chat
    const openPolls = ctx.db.collection<PollData>("openPolls");
    
    // Check for existing polls for this user in this chat
    const existingOpenPoll = await openPolls.findOne({ userId, chatId });

    if (existingOpenPoll) {
        console.log(`User ${userId} already has an active poll (ID: ${existingOpenPoll.pollId}). Skipping new poll creation.`);
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
        handle: userHandle,
        pollId: pollMessage.poll.id,
        messageId: pollMessage.message_id,
        chatId: chatId,
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

async function addToClosedPolls(ctx: BotContext, pollData: PollData) {
    const openPolls = ctx.db.collection("openPolls");
    const closedPolls = ctx.db.collection("closedPolls");
    
    try {
        // 1. First, find the poll in openPolls
        const currentPoll = await openPolls.findOne(
            { pollId: pollData.pollId }
        );
        
        if (!currentPoll) {
            throw new Error(`Poll ID ${pollData.pollId} not found in openPolls`);
        }
        
        // 2. Remove the poll from openPolls
        await openPolls.deleteOne({ pollId: pollData.pollId });
        
        // 2. Stop the poll to get the final results
        const pollResults = await ctx.api.stopPoll(
            pollData.chatId,
            pollData.messageId,
        );
        
        // 4. Create the PollResults object with the final results
        const results: PollResults = {
            totalVoters: pollResults.total_voter_count,
            options: pollResults.options.map((option) => ({
                text: option.text,
                voterCount: option.voter_count || 0,
            })),
        };
        
        // 5. Prepare the closed poll data with results
        const closedPollData = {
            ...currentPoll,
            results: results,
            closedAt: new Date(),
        };
        
        // 6. Insert into closedPolls
        await closedPolls.insertOne(closedPollData);
        
        console.log(
            `Poll ID ${pollData.pollId} moved from openPolls to closedPolls with results.`,
        );
    } catch (error) {
        console.error(
            `Error moving poll ID ${pollData.pollId} to closedPolls:`,
            error,
        );
        // If there was an error after removing from openPolls but before adding to closedPolls,
        // the poll will be lost. In a production environment, you might want to implement
        // a recovery mechanism here.
        throw error; // Re-throw to allow the caller to handle the error
    }
}

pollManager.command("checky", async (ctx) => {
    // First, process any expired polls
    const removedPollIds = await isPollClosed(ctx);
    const count = removedPollIds.length;
    
    // Get current open polls
    const openPolls = ctx.db.collection<PollData>("openPolls");
    const currentPolls = await openPolls.find().toArray();
    
    if (currentPolls.length > 0) {
        // Format message for each open poll
        const pollMessages = await Promise.all(currentPolls.map(async (poll) => {
            const timeLeftMs = poll.expirationTime - Date.now();
            const minutesLeft = Math.ceil(timeLeftMs / (60 * 1000));
            const timeLeftText = minutesLeft > 0 
                ? `⏳ ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''} remaining`
                : '🕒 Expired (processing...)';
                
            try {
                // Try to get user info to show their name
                const user = await ctx.api.getChatMember(poll.chatId, poll.userId);
                const userName = user.user.first_name || `User ${poll.userId}`;
                return `👤 ${userName} - ${timeLeftText}`;
            } catch (error) {
                console.error(`Error getting user info for ${poll.userId}:`, error);
                return `👤 User ${poll.userId} - ${timeLeftText}`;
            }
        }));
        
        const header = currentPolls.length === 1 
            ? '📋 Current open poll:' 
            : `📋 ${currentPolls.length} open polls:`;
            
        await ctx.reply(
            `${header}\n\n` +
            pollMessages.join('\n') +
            (count > 0 ? `\n\n✅ Processed ${count} closed poll${count > 1 ? 's' : ''}` : '')
        );
    } else {
        const message = count > 0 
            ? `✅ No open polls. Processed ${count} closed poll${count > 1 ? 's' : ''}.`
            : 'ℹ️ No open or recently closed polls.';
        await ctx.reply(message);
    }
});

async function isPollClosed(ctx: BotContext): Promise<string[]> {
    try {
        console.log("Starting isPollClosed check...");
        const openPolls = ctx.db.collection<PollData>("openPolls");
        
        // Get current timestamp
        const currentTime = Date.now();
        console.log(`Current time: ${new Date(currentTime).toISOString()}`);
        
        // Find all polls that have expired
        const expiredPolls = await openPolls.find({
            expirationTime: { $lte: currentTime }
        }).toArray();
        
        console.log(`Found ${expiredPolls.length} expired polls`);
        
        // Track all poll IDs we found, regardless of processing success
        const expiredPollIds = expiredPolls.map(poll => poll.pollId);
        
        // Process each expired poll
        const successfullyProcessed: string[] = [];
        const failedToProcess: string[] = [];
        
        for (const poll of expiredPolls) {
            try {
                console.log(`Processing expired poll ID: ${poll.pollId}, expired at: ${new Date(poll.expirationTime).toISOString()}`);
                
                // Move to closedPolls
                await addToClosedPolls(ctx, poll);
                
                // Remove from openPolls
                await openPolls.deleteOne({ pollId: poll.pollId });
                
                console.log(`Successfully moved poll ${poll.pollId} to closedPolls`);
                successfullyProcessed.push(poll.pollId);
                
            } catch (error) {
                console.error(`Error processing poll ${poll.pollId}:`, error);
                failedToProcess.push(poll.pollId);
            }
        }
        
        // Log summary
        if (expiredPolls.length === 0) {
            console.log("No expired polls found to process.");
        } else {
            console.log(`Processing summary:`);
            console.log(`- Total expired polls found: ${expiredPolls.length}`);
            console.log(`- Successfully processed: ${successfullyProcessed.length}`);
            if (failedToProcess.length > 0) {
                console.log(`- Failed to process: ${failedToProcess.length} (${failedToProcess.join(', ')})`);
            }
        }
        
        return expiredPollIds; // Return all expired poll IDs we found, regardless of processing status
        
    } catch (error) {
        console.error("Error in isPollClosed:", error);
        throw error;
    }
}