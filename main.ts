// index.ts
import { serve, sql } from "bun";

console.log("Startup!");
await sql`CREATE TABLE IF NOT EXISTS text (
    id BIGSERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    instanceId VARCHAR(256) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;
await sql`CREATE INDEX IF NOT EXISTS text_instance ON text (instanceId);`;

console.log("Ran migration command!");

serve({
    port: 3000,
    async fetch(req) {
        const url = new URL(req.url);

        // Construct a new URL for the target server.
        const newUrl = new URL(process.env.API_URL ?? "");
        newUrl.pathname = url.pathname;
        newUrl.search = url.search;

        // Create a new request to forward.
        const data = await req.body?.text();

        // Check for the /users route
        if (url.pathname === "/v2/check") {
            console.log(req.headers);

            // Check for a GET request
            const instanceId = url.searchParams.get("instanceId");
            try {
                const dataParse = new URLSearchParams(data);
                const parsedData: Record<string, string> = JSON.parse(
                    dataParse.get("data") ?? "null"
                );
                const text = parsedData?.text;

                await sql`
                INSERT INTO text (text, instanceId)
                VALUES (${text}, ${instanceId})
                ON CONFLICT (instanceId) DO UPDATE SET
                    text       = excluded.text;
                `;
            } catch (e) {
                console.error("fucked");
            }
        }

        const forwardedRequest = new Request(newUrl.toString(), {
            method: req.method,
            body: data,
        });

        // Fetch the response from the target server.
        const response = await fetch(forwardedRequest);

        // Return the response from the target server.
        return response;
    },
});

console.log("Staring server on localhost:3000");
