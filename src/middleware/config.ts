// config.ts
export const ENV = {
    BOT_TOKEN: Deno.env.get("BOT_TOKEN") || "",
    MONGO_URI: Deno.env.get("MONGODB_URI") || "",
    MONGO_DB: Deno.env.get("MONGODB_DB") || "",
    ADMIN_CHAT_ID: parseInt(Deno.env.get("ADMIN_CHAT_ID") || "0", 10),
    POLL_EXPIRATION: 300 * 1000, // 5 minutes
};

// Type guard function to check if a value is defined
export function isDefined<T>(value: T | undefined): value is T {
    return value !== undefined;
}

// Validate required configuration
const requiredConfigs: (keyof typeof ENV)[] = [
    "BOT_TOKEN",
    "MONGO_URI",
    "MONGO_DB",
    "ADMIN_CHAT_ID",
];

requiredConfigs.forEach((key) => {
    if (!isDefined(ENV[key])) {
        throw new Error(`Missing required configuration: ${key}`);
    }
});
