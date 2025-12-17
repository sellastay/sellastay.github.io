import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.SYNCIA_PORT || 4000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    throw new Error("Set OPENAI_API_KEY in your .env before running syncia-proxy");
}

app.use(express.json());

app.post("/api/syncia", async (req, res) => {
    const { messages, metadata = {}, timeout = 60000 } = req.body;
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "messages array is required" });
    }

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages,
                temperature: 0.6,
                max_tokens: 800,
            }),
            timeout,
        });

        if (!response.ok) {
            const body = await response.text();
            return res.status(response.status).send(body);
        }

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content ?? "";
        let parsed = { reply: content };

        try {
            const match = content.match(/```json([\s\S]*?)```/);
            if (match) {
                parsed = {
                    ...parsed,
                    ...JSON.parse(match[1].trim()),
                };
            }
        } catch (error) {
            // ignore esse erro "parse errors"
        }

        res.json({
            ...parsed,
            metadata,
            model: result.model,
        });
    } catch (error) {
        console.error("OpenAI error", error);
        res.status(500).json({ error: "Unable to reach OpenAI" });
    }
});

if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        console.log(`syncia-proxy listening on http://localhost:${PORT}`);
    });
}

export default app;
