// src/middleware/dbAcess.ts
import { MongoClient } from "https://deno.land/x/mongo@v0.32.0/mod.ts";
import { Context, MiddlewareFn } from "grammY";
import { Database } from "MDBClient";
import { AllSessionData } from "../types/sessions.ts";

// Define the extended context with session data
export type BaseContext = Context & {
    session: AllSessionData;
    db: Database;
};

let client: MongoClient;
let db: Database;

export async function connectToMongo(
    uri: string,
    dbName: string,
): Promise<void> {
    client = new MongoClient();
    await client.connect(uri);
    db = client.database(dbName);
}

export const dbMiddleware: MiddlewareFn<BaseContext> = async (ctx, next) => {
    ctx.db = db;

    // Ensure session is initialized
    if (!ctx.session) {
        ctx.session = { chatId: 0, polls: [] } as AllSessionData;
    }

    await next();
};

export async function closeMongoConnection(): Promise<void> {
    if (client) {
        await client.close();
    }
}