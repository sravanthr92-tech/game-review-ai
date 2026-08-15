import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// CHECK ENVIRONMENT VARIABLES
// ==========================================

const requiredKeys = [
    "GEMINI_API_KEY",
    "TWITCH_CLIENT_ID",
    "TWITCH_CLIENT_SECRET"
];

for (const key of requiredKeys) {
    if (!process.env[key]) {
        console.error(`❌ ${key} not found in .env`);
        process.exit(1);
    }
}

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ==========================================
// HOME PAGE
// ==========================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// ==========================================
// TWITCH ACCESS TOKEN
// ==========================================

let twitchAccessToken = null;
let tokenExpiresAt = 0;

async function getTwitchAccessToken() {

    if (
        twitchAccessToken &&
        Date.now() < tokenExpiresAt
    ) {
        return twitchAccessToken;
    }

    console.log("🔐 Getting Twitch access token...");

    const params = new URLSearchParams();

    params.append(
        "client_id",
        process.env.TWITCH_CLIENT_ID
    );

    params.append(
        "client_secret",
        process.env.TWITCH_CLIENT_SECRET
    );

    params.append(
        "grant_type",
        "client_credentials"
    );

    const response = await fetch(
        "https://id.twitch.tv/oauth2/token",
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            },

            body: params.toString()
        }
    );

    const data = await response.json();

    if (!response.ok) {

        console.error(
            "❌ Twitch OAuth Error:",
            JSON.stringify(data, null, 2)
        );

        throw new Error(
            data.message ||
            "Unable to get Twitch access token."
        );
    }

    twitchAccessToken =
        data.access_token;

    tokenExpiresAt =
        Date.now() +
        (data.expires_in * 1000) -
        60000;

    console.log(
        "✅ Twitch access token obtained."
    );

    return twitchAccessToken;
}

// ==========================================
// NORMALIZE GAME NAME
// ==========================================

function normalizeGameName(name) {

    return String(name)
        .toLowerCase()
        .replace(/[™®©]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

// ==========================================
// CREATE IGDB IMAGE URL
// ==========================================

function createIGDBImage(imageId) {

    if (!imageId) {
        return "";
    }

    return (
        "https://images.igdb.com/igdb/image/upload/" +
        `t_cover_big/${imageId}.jpg`
    );
}

// ==========================================
// SEARCH IGDB
// ==========================================

async function searchIGDB(gameName) {

    const accessToken =
        await getTwitchAccessToken();

    console.log(
        "🎮 Searching IGDB for:",
        gameName
    );

    const query = `
        search "${gameName}";
        fields
            id,
            name,
            cover.image_id,
            genres.name,
            involved_companies.company.name,
            involved_companies.developer,
            first_release_date,
            rating,
            rating_count,
            summary,
            url;
        limit 10;
    `;

    const response = await fetch(
        "https://api.igdb.com/v4/games",
        {
            method: "POST",

            headers: {
                "Client-ID":
                    process.env.TWITCH_CLIENT_ID,

                "Authorization":
                    `Bearer ${accessToken}`,

                "Content-Type":
                    "text/plain"
            },

            body: query
        }
    );

    const data =
        await response.json();

    if (!response.ok) {

        console.error(
            "❌ IGDB Error:",
            JSON.stringify(
                data,
                null,
                2
            )
        );

        throw new Error(
            data.message ||
            "IGDB request failed."
        );
    }

    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {

        console.log(
            "⚠️ No IGDB results for:",
            gameName
        );

        return null;
    }

    // ======================================
    // FIND BEST MATCH
    // ======================================

    const searchName =
        normalizeGameName(gameName);

    let game =
        data.find(item =>
            normalizeGameName(item.name) ===
            searchName
        );

    if (!game) {

        game =
            data.find(item => {

                const title =
                    normalizeGameName(
                        item.name
                    );

                return (
                    title.startsWith(searchName) ||
                    searchName.startsWith(title)
                );
            });
    }

    if (!game) {
        game = data[0];
    }

    console.log(
        "🎯 Selected IGDB game:",
        game.name
    );

    console.log(
        "🆔 IGDB ID:",
        game.id
    );

    console.log(
        "🖼️ IGDB image ID:",
        game.cover?.image_id || "NONE"
    );

    // ======================================
    // IMAGE
    // ======================================

    const image =
        createIGDBImage(
            game.cover?.image_id
        );

    // ======================================
    // GENRE
    // ======================================

    let genre = "Unknown";

    if (
        Array.isArray(game.genres) &&
        game.genres.length > 0
    ) {

        genre =
            game.genres
                .map(g => g.name)
                .filter(Boolean)
                .join(", ");
    }

    // ======================================
    // DEVELOPER
    // ======================================

    let developer = "Unknown";

    if (
        Array.isArray(
            game.involved_companies
        )
    ) {

        developer =
            game.involved_companies
                .filter(company =>
                    company.developer !== false
                )
                .map(company =>
                    company.company?.name
                )
                .filter(Boolean)
                .join(", ");

        if (!developer) {
            developer = "Unknown";
        }
    }

    // ======================================
    // RELEASE DATE
    // ======================================

    let release = "Unknown";

    if (
        typeof game.first_release_date ===
        "number"
    ) {

        const date =
            new Date(
                game.first_release_date * 1000
            );

        release =
            date
                .toISOString()
                .split("T")[0];
    }

    // ======================================
    // RATING
    // ======================================

    let rating = "N/A";

    if (
        typeof game.rating ===
        "number"
    ) {

        rating =
            `${(
                game.rating / 20
            ).toFixed(1)} / 5`;
    }

    // ======================================
    // REVIEW COUNT
    // ======================================

    let reviews = "N/A";

    if (
        typeof game.rating_count ===
        "number"
    ) {

        reviews =
            game.rating_count.toString();
    }

    // ======================================
    // RETURN GAME DATA
    // ======================================

    return {

        id:
            game.id || "",

        title:
            game.name || gameName,

        image,

        image_id:
            game.cover?.image_id || "",

        genre,

        developer,

        release,

        rating,

        reviews,

        summary:
            game.summary || "",

        igdb_url:
            game.url || ""
    };
}

// ==========================================
// GEMINI AI REVIEW
// ==========================================

async function generateAIReview(gameInfo) {

    const prompt = `
You are an expert video game reviewer.

Use ONLY the factual information provided
from IGDB.

Return ONLY valid JSON.

Do NOT use markdown.
Do NOT use code fences.
Do NOT add explanations.

Return exactly:

{
    "title": "",
    "rating": "",
    "reviews": "",
    "genre": "",
    "developer": "",
    "release": "",
    "features": [
        "",
        "",
        "",
        "",
        ""
    ],
    "review": ""
}

Rules:

1. Keep the exact IGDB game title.
2. Keep the IGDB rating.
3. Keep the IGDB review count.
4. Keep the IGDB genre.
5. Keep the IGDB developer.
6. Keep the IGDB release date.
7. Provide exactly 5 short features.
8. Keep the review below 120 words.
9. Do not invent factual information.
10. Do not create an image URL.
11. If information is unavailable, use "N/A".

GAME DATA:

${JSON.stringify(
    gameInfo,
    null,
    2
)}
`;

    // ======================================
    // GEMINI MODEL
    // ======================================

    const model =
        "gemini-3.5-flash-lite";

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json",

                "x-goog-api-key":
                    process.env.GEMINI_API_KEY
            },

            body: JSON.stringify({

                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ]

            })
        }
    );

    const result =
        await response.json();

    console.log(
        "🤖 Gemini HTTP Status:",
        response.status
    );

    if (!response.ok) {

        console.error(
            "❌ Gemini Error:",
            JSON.stringify(
                result,
                null,
                2
            )
        );

        throw new Error(
            result.error?.message ||
            "Gemini API request failed."
        );
    }

    let text =
        result
            .candidates?.[0]
            ?.content?.parts?.[0]
            ?.text || "";

    if (!text) {

        throw new Error(
            "Gemini returned an empty response."
        );
    }

    text =
        text
            .replace(
                /```json/gi,
                ""
            )
            .replace(
                /```/g,
                ""
            )
            .trim();

    // ======================================
    // PARSE JSON
    // ======================================

    try {

        const parsed =
            JSON.parse(text);

        if (
            !Array.isArray(
                parsed.features
            )
        ) {

            parsed.features = [];
        }

        parsed.features =
            parsed.features
                .filter(Boolean)
                .slice(0, 5);

        while (
            parsed.features.length < 5
        ) {

            parsed.features.push(
                "Information unavailable"
            );
        }

        return {

            title:
                gameInfo.title,

            rating:
                gameInfo.rating,

            reviews:
                gameInfo.reviews,

            genre:
                gameInfo.genre,

            developer:
                gameInfo.developer,

            release:
                gameInfo.release,

            features:
                parsed.features,

            review:
                parsed.review ||
                "No AI review available."
        };

    } catch {

        console.warn(
            "⚠️ Gemini JSON parsing failed."
        );

        return {

            title:
                gameInfo.title,

            rating:
                gameInfo.rating,

            reviews:
                gameInfo.reviews,

            genre:
                gameInfo.genre,

            developer:
                gameInfo.developer,

            release:
                gameInfo.release,

            features: [
                "Gameplay",
                "Game mechanics",
                "Visual design",
                "Sound and music",
                "Overall experience"
            ],

            review:
                text
        };
    }
}

// ==========================================
// REVIEW ENDPOINT
// ==========================================

app.post(
    "/review",
    async (req, res) => {

        try {

            const game =
                req.body?.game?.trim();

            if (!game) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Game name is required."
                });
            }

            console.log(
                "======================================="
            );

            console.log(
                "🔎 SEARCH:",
                game
            );

            // ==================================
            // IGDB
            // ==================================

            const gameInfo =
                await searchIGDB(game);

            if (!gameInfo) {

                return res.status(404).json({

                    success: false,

                    error:
                        `Game "${game}" was not found on IGDB.`
                });
            }

            console.log(
                "✅ IGDB selected:",
                gameInfo.title
            );

            console.log(
                "🖼️ IGDB image URL:",
                gameInfo.image ||
                "No image"
            );

            // ==================================
            // GEMINI
            // ==================================

            const aiData =
                await generateAIReview(
                    gameInfo
                );

            // ==================================
            // RESPONSE
            // ==================================

            res.json({

                success: true,

                game: gameInfo,

                ai: {

                    ...aiData,

                    image:
                        gameInfo.image
                }
            });

            console.log(
                "✅ Review completed successfully."
            );

            console.log(
                "======================================="
            );

        } catch (error) {

            console.error(
                "❌ SERVER ERROR:"
            );

            console.error(error);

            res.status(500).json({

                success: false,

                error:
                    error.message ||
                    "Server error."
            });
        }
    }
);

// ==========================================
// START SERVER
// ==========================================

app.listen(
    PORT,
    () => {

        console.log(
            "======================================="
        );

        console.log(
            "🎮 AI Game Review Server Running"
        );

        console.log(
            `🌐 http://localhost:${PORT}`
        );

        console.log(
            "🎮 Game Data: IGDB"
        );

        console.log(
            "🖼️ Game Images: IGDB"
        );

        console.log(
            "📥 Downloads: More than 50M+"
        );

        console.log(
            "======================================="
        );
    }
);