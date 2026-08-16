import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import gplay from "@mradex77/google-play-scraper";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// ENVIRONMENT
// =====================================================

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

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// =====================================================
// HELPERS
// =====================================================

function normalizeGameName(name) {
    return String(name || "")
        .toLowerCase()
        .replace(/[™®©]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function similarityScore(searchName, resultName) {

    const a = normalizeGameName(searchName);
    const b = normalizeGameName(resultName);

    if (!a || !b) {
        return 0;
    }

    if (a === b) {
        return 100;
    }

    if (
        a.includes(b) ||
        b.includes(a)
    ) {
        return 80;
    }

    const aWords = new Set(a.split(" "));
    const bWords = new Set(b.split(" "));

    let common = 0;

    for (const word of aWords) {
        if (bWords.has(word)) {
            common++;
        }
    }

    const total =
        Math.max(
            aWords.size,
            bWords.size
        );

    return total
        ? Math.round(
            (common / total) * 60
        )
        : 0;
}

function createIGDBImage(imageId) {

    if (!imageId) {
        return "";
    }

    return (
        "https://images.igdb.com/igdb/image/upload/" +
        "t_cover_big/" +
        imageId +
        ".jpg"
    );
}

function formatNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "Not publicly available";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return String(value);
    }

    if (number >= 1000000000) {
        return (
            (number / 1000000000)
                .toFixed(1)
                .replace(".0", "") +
            "B+"
        );
    }

    if (number >= 1000000) {
        return (
            (number / 1000000)
                .toFixed(1)
                .replace(".0", "") +
            "M+"
        );
    }

    if (number >= 1000) {
        return (
            (number / 1000)
                .toFixed(1)
                .replace(".0", "") +
            "K+"
        );
    }

    return number.toLocaleString();
}

function formatDate(unixSeconds) {

    if (
        typeof unixSeconds !== "number"
    ) {
        return "Not available";
    }

    const date =
        new Date(unixSeconds * 1000);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date
        .toISOString()
        .split("T")[0];
}

function formatTimestamp(timestamp) {

    if (
        typeof timestamp !== "number"
    ) {
        return "Not available";
    }

    const date =
        new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date
        .toISOString()
        .split("T")[0];
}

// =====================================================
// TWITCH / IGDB TOKEN
// =====================================================

let twitchAccessToken = null;
let tokenExpiresAt = 0;

async function getTwitchAccessToken() {

    if (
        twitchAccessToken &&
        Date.now() < tokenExpiresAt
    ) {
        return twitchAccessToken;
    }

    console.log(
        "🔐 Getting Twitch access token..."
    );

    const params =
        new URLSearchParams();

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

    const response =
        await fetch(
            "https://id.twitch.tv/oauth2/token",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body:
                    params.toString()
            }
        );

    const data =
        await response.json();

    if (!response.ok) {

        throw new Error(
            data.message ||
            "Unable to obtain Twitch access token."
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

// =====================================================
// IGDB SEARCH
// =====================================================

async function searchIGDB(gameName) {

    const accessToken =
        await getTwitchAccessToken();

    const safeName =
        String(gameName)
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"');

    const query = `
        search "${safeName}";
        fields
            id,
            name,
            slug,
            summary,
            storyline,
            cover.image_id,
            genres.name,
            involved_companies.company.name,
            involved_companies.developer,
            involved_companies.publisher,
            first_release_date,
            rating,
            rating_count,
            aggregated_rating,
            aggregated_rating_count,
            total_rating,
            total_rating_count,
            platforms.name,
            platforms.abbreviation,
            game_modes.name,
            themes.name,
            player_perspectives.name,
            keywords.name,
            franchise.name,
            franchises.name,
            collection.name,
            websites.url,
            websites.category,
            url;
        limit 15;
    `;

    console.log(
        "🎮 Searching IGDB:",
        gameName
    );

    const response =
        await fetch(
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
            "❌ IGDB error:",
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
        return null;
    }

    let bestGame = data[0];
    let bestScore = 0;

    for (const item of data) {

        const score =
            similarityScore(
                gameName,
                item.name
            );

        if (score > bestScore) {
            bestScore = score;
            bestGame = item;
        }
    }

    console.log(
        "🎯 IGDB selected:",
        bestGame.name,
        "| match:",
        bestScore
    );

    // =================================================
    // IMAGE
    // =================================================

    const image =
        createIGDBImage(
            bestGame.cover?.image_id
        );

    // =================================================
    // GENRES
    // =================================================

    const genres =
        Array.isArray(bestGame.genres)
            ? bestGame.genres
                .map(x => x.name)
                .filter(Boolean)
            : [];

    // =================================================
    // DEVELOPER / PUBLISHER
    // =================================================

    const companies =
        Array.isArray(
            bestGame.involved_companies
        )
            ? bestGame.involved_companies
            : [];

    const developers =
        companies
            .filter(
                x => x.developer === true
            )
            .map(
                x => x.company?.name
            )
            .filter(Boolean);

    const publishers =
        companies
            .filter(
                x => x.publisher === true
            )
            .map(
                x => x.company?.name
            )
            .filter(Boolean);

    // =================================================
    // PLATFORMS
    // =================================================

    const platforms =
        Array.isArray(
            bestGame.platforms
        )
            ? bestGame.platforms
                .map(x => x.name)
                .filter(Boolean)
            : [];

    // =================================================
    // GAME MODES
    // =================================================

    const gameModes =
        Array.isArray(
            bestGame.game_modes
        )
            ? bestGame.game_modes
                .map(x => x.name)
                .filter(Boolean)
            : [];

    // =================================================
    // THEMES
    // =================================================

    const themes =
        Array.isArray(bestGame.themes)
            ? bestGame.themes
                .map(x => x.name)
                .filter(Boolean)
            : [];

    // =================================================
    // PERSPECTIVES
    // =================================================

    const perspectives =
        Array.isArray(
            bestGame.player_perspectives
        )
            ? bestGame.player_perspectives
                .map(x => x.name)
                .filter(Boolean)
            : [];

    // =================================================
    // KEYWORDS
    // =================================================

    const keywords =
        Array.isArray(
            bestGame.keywords
        )
            ? bestGame.keywords
                .map(x => x.name)
                .filter(Boolean)
                .slice(0, 20)
            : [];

    // =================================================
    // RATING
    // =================================================

    let rating =
        "Not publicly available";

    if (
        typeof bestGame.rating ===
        "number"
    ) {

        rating =
            (
                bestGame.rating / 20
            ).toFixed(1) +
            " / 5";
    }

    // =================================================
    // REVIEW / RATING COUNT
    // =================================================

    let reviews =
        "Not publicly available";

    if (
        typeof bestGame.rating_count ===
        "number"
    ) {

        reviews =
            formatNumber(
                bestGame.rating_count
            );
    }

    // =================================================
    // RELEASE
    // =================================================

    const release =
        formatDate(
            bestGame.first_release_date
        );

    // =================================================
    // RETURN IGDB DATA
    // =================================================

    return {

        source: "IGDB",

        id:
            bestGame.id || "",

        title:
            bestGame.name ||
            gameName,

        slug:
            bestGame.slug || "",

        image,

        image_id:
            bestGame.cover?.image_id ||
            "",

        rating,

        reviews,

        genre:
            genres.join(", ") ||
            "Not available",

        genres,

        developer:
            developers.join(", ") ||
            "Not available",

        developers,

        publisher:
            publishers.join(", ") ||
            "Not available",

        publishers,

        release,

        platforms,

        gameModes,

        themes,

        perspectives,

        keywords,

        franchise:
            bestGame.franchise?.name ||
            "",

        collection:
            bestGame.collection?.name ||
            "",

        summary:
            bestGame.summary ||
            "",

        storyline:
            bestGame.storyline ||
            "",

        websites:
            Array.isArray(
                bestGame.websites
            )
                ? bestGame.websites
                : [],

        igdb_url:
            bestGame.url ||
            ""
    };
}

// =====================================================
// GOOGLE PLAY SEARCH
// =====================================================

async function searchGooglePlay(
    gameName,
    igdbGame
) {

    console.log(
        "📱 Searching Google Play:",
        gameName
    );

    try {

        const results =
            await gplay.search({
                term: gameName,
                num: 10,
                country: "us",
                lang: "en"
            });

        if (
            !Array.isArray(results) ||
            results.length === 0
        ) {

            console.log(
                "⚠️ No Google Play results."
            );

            return null;
        }

        // =============================================
        // FIND BEST RESULT
        // =============================================

        let best = null;
        let bestScore = 0;

        for (
            const result of results
        ) {

            const score =
                similarityScore(
                    gameName,
                    result.title
                );

            // Strong preference for game-looking
            // results when IGDB title matches.

            if (
                score > bestScore
            ) {
                bestScore = score;
                best = result;
            }
        }

        if (
            !best ||
            bestScore < 45
        ) {

            console.log(
                "⚠️ Google Play match too weak."
            );

            return null;
        }

        console.log(
            "🎯 Google Play selected:",
            best.title,
            "| match:",
            bestScore,
            "| app:",
            best.appId
        );

        // =============================================
        // GET FULL APP DETAILS
        // =============================================

        const details =
            await gplay.app({
                appId: best.appId,
                country: "us",
                lang: "en"
            });

        if (!details) {
            return null;
        }

        return {

            source:
                "Google Play",

            appId:
                details.appId ||
                best.appId ||
                "",

            title:
                details.title ||
                best.title ||
                "",

            installs:
                details.installs ||
                "Not publicly available",

            minInstalls:
                details.minInstalls ??
                null,

            score:
                details.score ??
                null,

            scoreText:
                details.scoreText ||
                "Not publicly available",

            ratings:
                details.ratings ??
                null,

            reviews:
                details.reviews ??
                null,

            genre:
                details.genre ||
                "",

            categories:
                Array.isArray(
                    details.categories
                )
                    ? details.categories
                        .map(x => x.name)
                        .filter(Boolean)
                    : [],

            developer:
                details.developer ||
                "",

            developerId:
                details.developerId ||
                "",

            developerEmail:
                details.developerEmail ||
                "",

            developerWebsite:
                details.developerWebsite ||
                "",

            description:
                details.description ||
                "",

            summary:
                details.summary ||
                "",

            icon:
                details.icon ||
                "",

            screenshots:
                Array.isArray(
                    details.screenshots
                )
                    ? details.screenshots
                    : [],

            contentRating:
                details.contentRating ||
                "",

            androidVersion:
                details.androidVersion ||
                "",

            androidVersionText:
                details.androidVersionText ||
                "",

            version:
                details.version ||
                "",

            updated:
                formatTimestamp(
                    details.updated
                ),

            price:
                details.price ??
                null,

            priceText:
                details.priceText ||
                "",

            free:
                details.free ??
                null,

            currency:
                details.currency ||
                "",

            offersIAP:
                details.offersIAP ??
                null,

            adSupported:
                details.adSupported ??
                null,

            available:
                details.available ??
                null,

            url:
                details.url ||
                ""
        };

    } catch (error) {

        console.warn(
            "⚠️ Google Play lookup failed:",
            error.message
        );

        return null;
    }
}

// =====================================================
// MERGE DATA
// =====================================================

function mergeGameData(
    igdb,
    play
) {

    const playAvailable =
        !!play;

    // ================================================
    // DOWNLOADS
    // ================================================

    let downloads =
        "Not publicly available";

    if (
        playAvailable &&
        play.installs
    ) {

        downloads =
            play.installs;
    }

    // ================================================
    // PLAY REVIEWS
    // ================================================

    let playReviewCount =
        "Not publicly available";

    if (
        playAvailable &&
        typeof play.reviews ===
        "number"
    ) {

        playReviewCount =
            formatNumber(
                play.reviews
            );
    }

    // ================================================
    // PLAY RATINGS
    // ================================================

    let playRating =
        "Not publicly available";

    if (
        playAvailable &&
        play.scoreText
    ) {

        playRating =
            `${play.scoreText} / 5`;
    }

    // ================================================
    // MAIN DATA
    // ================================================

    return {

        ...igdb,

        // --------------------------------------------
        // Google Play
        // --------------------------------------------

        googlePlayAvailable:
            playAvailable,

        googlePlay:

            play || null,

        googlePlayTitle:
            play?.title ||
            "",

        googlePlayUrl:
            play?.url ||
            "",

        // --------------------------------------------
        // Downloads
        // --------------------------------------------

        downloads,

        downloadSource:
            playAvailable
                ? "Google Play"
                : "Not publicly available",

        // --------------------------------------------
        // Reviews
        // --------------------------------------------

        playReviews:
            playReviewCount,

        playRatings:
            play?.ratings ??
            null,

        playRating:

            playRating,

        // --------------------------------------------
        // Better developer
        // --------------------------------------------

        finalDeveloper:
            play?.developer ||
            igdb.developer ||
            "Not available",

        // --------------------------------------------
        // Better genre
        // --------------------------------------------

        finalGenre:
            igdb.genre !==
            "Not available"
                ? igdb.genre
                : (
                    play?.genre ||
                    "Not available"
                ),

        // --------------------------------------------
        // Description
        // --------------------------------------------

        finalDescription:
            igdb.summary ||
            play?.description ||
            "Not available"
    };
}

// =====================================================
// GEMINI
// =====================================================

async function generateAIReview(
    gameInfo
) {

    const model =
        process.env.GEMINI_MODEL ||
        "gemini-3.5-flash-lite";

    const prompt = `
You are an expert video game reviewer.

The data below comes from external game-data sources.

Your job is ONLY to create:
1. Five short game features.
2. A useful review under 120 words.

IMPORTANT:
- Do NOT invent download numbers.
- Do NOT invent review counts.
- Do NOT invent ratings.
- Do NOT invent release dates.
- Do NOT change the game title.
- Do NOT create URLs.
- Use the supplied factual data.
- If something is unavailable, do not guess it.

Return ONLY valid JSON.

Format:

{
    "features": [
        "",
        "",
        "",
        "",
        ""
    ],
    "review": ""
}

GAME DATA:

${JSON.stringify(
    gameInfo,
    null,
    2
)}
`;

    console.log(
        "🤖 Gemini model:",
        model
    );

    const response =
        await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "x-goog-api-key":
                        process.env.GEMINI_API_KEY
                },

                body:
                    JSON.stringify({

                        contents: [
                            {
                                parts: [
                                    {
                                        text:
                                            prompt
                                    }
                                ]
                            }
                        ],

                        generationConfig: {
                            temperature: 0.4,
                            responseMimeType:
                                "application/json"
                        }
                    })
            }
        );

    const result =
        await response.json();

    if (!response.ok) {

        console.error(
            "❌ Gemini error:",
            JSON.stringify(
                result,
                null,
                2
            )
        );

        throw new Error(
            result.error?.message ||
            "Gemini request failed."
        );
    }

    let text =
        result
            .candidates?.[0]
            ?.content?.parts?.[0]
            ?.text ||
        "";

    if (!text) {

        throw new Error(
            "Gemini returned empty response."
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

    try {

        const parsed =
            JSON.parse(text);

        let features =
            Array.isArray(
                parsed.features
            )
                ? parsed.features
                : [];

        features =
            features
                .filter(Boolean)
                .slice(0, 5);

        while (
            features.length < 5
        ) {

            features.push(
                "Information unavailable"
            );
        }

        return {

            features,

            review:
                parsed.review ||
                "No AI review available."
        };

    } catch (error) {

        console.warn(
            "⚠️ Gemini JSON parsing failed."
        );

        return {

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

// =====================================================
// REVIEW API
// =====================================================

app.post(
    "/review",
    async (req, res) => {

        try {

            const game =
                req.body?.game?.trim();

            if (!game) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        error:
                            "Game name is required."
                    });
            }

            console.log(
                "\n======================================="
            );

            console.log(
                "🔎 SEARCH:",
                game
            );

            // =========================================
            // IGDB
            // =========================================

            const igdb =
                await searchIGDB(game);

            if (!igdb) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        error:
                            `Game "${game}" was not found on IGDB.`
                    });
            }

            // =========================================
            // GOOGLE PLAY
            // =========================================

            const play =
                await searchGooglePlay(
                    game,
                    igdb
                );

            // =========================================
            // MERGE
            // =========================================

            const gameInfo =
                mergeGameData(
                    igdb,
                    play
                );

            console.log(
                "🎮 TITLE:",
                gameInfo.title
            );

            console.log(
                "⭐ IGDB RATING:",
                gameInfo.rating
            );

            console.log(
                "📝 IGDB RATINGS:",
                gameInfo.reviews
            );

            console.log(
                "📱 PLAY RATINGS:",
                gameInfo.playRatings
            );

            console.log(
                "💬 PLAY REVIEWS:",
                gameInfo.playReviews
            );

            console.log(
                "📥 DOWNLOADS:",
                gameInfo.downloads
            );

            console.log(
                "🎭 GENRE:",
                gameInfo.finalGenre
            );

            console.log(
                "🏢 DEVELOPER:",
                gameInfo.finalDeveloper
            );

            // =========================================
            // GEMINI
            // =========================================

            let ai = {

                features: [
                    "Gameplay",
                    "Game mechanics",
                    "Visual design",
                    "Sound and music",
                    "Overall experience"
                ],

                review:
                    "AI review unavailable."
            };

            try {

                ai =
                    await generateAIReview(
                        gameInfo
                    );

            } catch (aiError) {

                console.error(
                    "⚠️ Gemini failed:",
                    aiError.message
                );
            }

            // =========================================
            // FINAL RESPONSE
            // =========================================

            return res.json({

                success: true,

                game: {

                    ...gameInfo,

                    // UI-friendly fields

                    title:
                        gameInfo.title,

                    image:
                        gameInfo.image,

                    rating:
                        gameInfo.rating,

                    reviews:
                        gameInfo.reviews,

                    downloads:
                        gameInfo.downloads,

                    genre:
                        gameInfo.finalGenre,

                    developer:
                        gameInfo.finalDeveloper,

                    release:
                        gameInfo.release,

                    summary:
                        gameInfo.finalDescription,

                    playReviews:
                        gameInfo.playReviews,

                    playRatings:
                        gameInfo.playRatings,

                    playRating:
                        gameInfo.playRating
                },

                ai: {

                    features:
                        ai.features,

                    review:
                        ai.review
                }

            });

        } catch (error) {

            console.error(
                "\n❌ SERVER ERROR:"
            );

            console.error(error);

            return res
                .status(500)
                .json({

                    success: false,

                    error:
                        error.message ||
                        "Server error."
                });
        }
    }
);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
    "/health",
    (req, res) => {

        res.json({

            success: true,

            server:
                "AI Game Review Server",

            igdb:
                "enabled",

            googlePlay:
                "enabled",

            gemini:
                "enabled",

            model:
                process.env.GEMINI_MODEL ||
                "gemini-3.5-flash-lite"
        });
    }
);

// =====================================================
// START
// =====================================================

app.listen(
    PORT,
    () => {

        console.log(
            "======================================="
        );

        console.log(
            "🎮 AI GAME REVIEW SERVER"
        );

        console.log(
            `🌐 http://localhost:${PORT}`
        );

        console.log(
            "🎮 IGDB: ENABLED"
        );

        console.log(
            "📱 Google Play: ENABLED"
        );

        console.log(
            "📥 Dynamic downloads: ENABLED"
        );

        console.log(
            "📝 Dynamic Play review count: ENABLED"
        );

        console.log(
            "🤖 Gemini: ENABLED"
        );

        console.log(
            "🤖 Model:",
            process.env.GEMINI_MODEL ||
            "gemini-3.5-flash-lite"
        );

        console.log(
            "======================================="
        );
    }
);