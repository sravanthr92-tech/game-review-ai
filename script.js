console.log(
    "✅ Final Game Review script.js loaded"
);

// =====================================================
// MAIN SEARCH
// =====================================================

async function askAI() {

    const input =
        document.getElementById(
            "gameInput"
        );

    const btn =
        document.getElementById(
            "searchButton"
        );

    const container =
        document.getElementById(
            "resultContainer"
        );

    if (
        !input ||
        !btn ||
        !container
    ) {

        console.error(
            "❌ Required HTML elements not found."
        );

        return;
    }

    const game =
        input.value.trim();

    if (!game) {

        container.innerHTML = `

            <div class="error-box">

                ❌ Please enter a game name.

            </div>

        `;

        return;
    }

    // =================================================
    // LOADING
    // =================================================

    btn.disabled = true;

    btn.textContent =
        "🔄 Searching...";

    container.innerHTML = `

        <div class="welcome">

            <h2>
                🔍 Searching for
                ${escapeHtml(game)}
            </h2>

            <p>
                Searching IGDB and Google Play
                and generating your AI review...
            </p>

        </div>

    `;

    try {

        // =================================================
        // API
        // =================================================

        const response =
            await fetch(
                "/review",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            game
                        })
                }
            );

        let data;

        try {

            data =
                await response.json();

        } catch {

            throw new Error(
                "Server returned an invalid response."
            );
        }

        console.log(
            "📦 SERVER RESPONSE:",
            data
        );

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                "Unable to load game."
            );
        }

        // =================================================
        // DATA
        // =================================================

        const g =
            data.game || {};

        const ai =
            data.ai || {};

        // =================================================
        // BASIC
        // =================================================

        const title =
            g.title ||
            game;

        const image =
            g.image ||
            g.googlePlay?.icon ||
            "";

        const rating =
            g.rating ||
            "Not publicly available";

        const reviews =
            g.reviews ||
            "Not publicly available";

        const downloads =
            g.downloads ||
            "Not publicly available";

        const genre =
            g.genre ||
            "Not available";

        const developer =
            g.developer ||
            "Not available";

        const publisher =
            g.publisher ||
            "Not available";

        const release =
            g.release ||
            "Not available";

        const summary =
            g.summary ||
            "No description available.";

        // =================================================
        // GOOGLE PLAY
        // =================================================

        const playAvailable =
            g.googlePlayAvailable === true;

        const play =
            g.googlePlay ||
            {};

        const playRating =
            g.playRating ||
            "Not publicly available";

        const playReviews =
            g.playReviews ||
            "Not publicly available";

        const playRatings =
            g.playRatings;

        // =================================================
        // ARRAYS
        // =================================================

        const platforms =
            Array.isArray(
                g.platforms
            )
                ? g.platforms
                : [];

        const gameModes =
            Array.isArray(
                g.gameModes
            )
                ? g.gameModes
                : [];

        const themes =
            Array.isArray(
                g.themes
            )
                ? g.themes
                : [];

        const perspectives =
            Array.isArray(
                g.perspectives
            )
                ? g.perspectives
                : [];

        const keywords =
            Array.isArray(
                g.keywords
            )
                ? g.keywords
                : [];

        const screenshots =
            Array.isArray(
                play.screenshots
            )
                ? play.screenshots
                : [];

        // =================================================
        // AI FEATURES
        // =================================================

        let features =
            Array.isArray(
                ai.features
            )
                ? ai.features
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

        const review =
            ai.review ||
            "AI review unavailable.";

        // =================================================
        // IMAGE HTML
        // =================================================

        let imageHTML = "";

        if (image) {

            imageHTML = `

                <div class="cover">

                    <img
                        src="${escapeHtml(image)}"
                        alt="${escapeHtml(title)}"
                        loading="lazy"
                        onerror="handleImageError(this)"
                    >

                </div>

            `;

        } else {

            imageHTML = `

                <div class="cover missing">

                    <div class="img-missing">

                        🎮

                        <br>

                        Game cover unavailable

                    </div>

                </div>

            `;
        }

        // =================================================
        // GOOGLE PLAY HTML
        // =================================================

        let googlePlayHTML = "";

        if (playAvailable) {

            googlePlayHTML = `

                <div class="features-box">

                    <h3>
                        📱 Google Play Information
                    </h3>

                    <p>
                        <strong>
                            Play Rating:
                        </strong>

                        ${escapeHtml(
                            playRating
                        )}
                    </p>

                    <p>
                        <strong>
                            Play Reviews:
                        </strong>

                        ${escapeHtml(
                            playReviews
                        )}
                    </p>

                    <p>
                        <strong>
                            Play Ratings:
                        </strong>

                        ${escapeHtml(
                            playRatings ??
                            "Not publicly available"
                        )}
                    </p>

                    ${
                        play.installs
                            ? `

                                <p>

                                    <strong>
                                        Downloads:
                                    </strong>

                                    ${escapeHtml(
                                        play.installs
                                    )}

                                </p>

                            `
                            : ""
                    }

                    ${
                        play.developer
                            ? `

                                <p>

                                    <strong>
                                        Play Developer:
                                    </strong>

                                    ${escapeHtml(
                                        play.developer
                                    )}

                                </p>

                            `
                            : ""
                    }

                    ${
                        play.version
                            ? `

                                <p>

                                    <strong>
                                        Version:
                                    </strong>

                                    ${escapeHtml(
                                        play.version
                                    )}

                                </p>

                            `
                            : ""
                    }

                    ${
                        play.updated
                            ? `

                                <p>

                                    <strong>
                                        Last Updated:
                                    </strong>

                                    ${escapeHtml(
                                        play.updated
                                    )}

                                </p>

                            `
                            : ""
                    }

                    ${
                        play.androidVersionText
                            ? `

                                <p>

                                    <strong>
                                        Android:
                                    </strong>

                                    ${escapeHtml(
                                        play.androidVersionText
                                    )}

                                </p>

                            `
                            : ""
                    }

                    ${
                        play.contentRating
                            ? `

                                <p>

                                    <strong>
                                        Content Rating:
                                    </strong>

                                    ${escapeHtml(
                                        play.contentRating
                                    )}

                                </p>

                            `
                            : ""
                    }

                    ${
                        play.free !== null &&
                        play.free !== undefined
                            ? `

                                <p>

                                    <strong>
                                        Free:
                                    </strong>

                                    ${play.free
                                        ? "Yes"
                                        : "No"}

                                </p>

                            `
                            : ""
                    }

                    ${
                        play.offersIAP !== null &&
                        play.offersIAP !== undefined
                            ? `

                                <p>

                                    <strong>
                                        In-App Purchases:
                                    </strong>

                                    ${play.offersIAP
                                        ? "Yes"
                                        : "No"}

                                </p>

                            `
                            : ""
                    }

                    ${
                        play.adSupported !== null &&
                        play.adSupported !== undefined
                            ? `

                                <p>

                                    <strong>
                                        Ads:
                                    </strong>

                                    ${play.adSupported
                                        ? "Yes"
                                        : "No"}

                                </p>

                            `
                            : ""
                    }

                    ${
                        play.url
                            ? `

                                <p>

                                    <a
                                        href="${escapeHtml(
                                            play.url
                                        )}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >

                                        Open Google Play

                                    </a>

                                </p>

                            `
                            : ""
                    }

                </div>

            `;

        } else {

            googlePlayHTML = `

                <div class="features-box">

                    <h3>
                        📱 Google Play Information
                    </h3>

                    <p>
                        Google Play information
                        was not confidently matched
                        for this game.
                    </p>

                </div>

            `;
        }

        // =================================================
        // FEATURES HTML
        // =================================================

        let featuresHTML = "";

        features.forEach(
            feature => {

                featuresHTML += `

                    <li>
                        ${escapeHtml(
                            feature
                        )}
                    </li>

                `;
            }
        );

        // =================================================
        // PLATFORMS
        // =================================================

        let platformsHTML = "";

        if (
            platforms.length > 0
        ) {

            platformsHTML = `

                <div class="features-box">

                    <h3>
                        🎮 Platforms
                    </h3>

                    <p>
                        ${escapeHtml(
                            platforms.join(", ")
                        )}
                    </p>

                </div>

            `;
        }

        // =================================================
        // GAME MODES
        // =================================================

        let modesHTML = "";

        if (
            gameModes.length > 0
        ) {

            modesHTML = `

                <div class="features-box">

                    <h3>
                        👥 Game Modes
                    </h3>

                    <p>
                        ${escapeHtml(
                            gameModes.join(", ")
                        )}
                    </p>

                </div>

            `;
        }

        // =================================================
        // THEMES
        // =================================================

        let themesHTML = "";

        if (
            themes.length > 0
        ) {

            themesHTML = `

                <div class="features-box">

                    <h3>
                        🎨 Themes
                    </h3>

                    <p>
                        ${escapeHtml(
                            themes.join(", ")
                        )}
                    </p>

                </div>

            `;
        }

        // =================================================
        // PERSPECTIVES
        // =================================================

        let perspectivesHTML = "";

        if (
            perspectives.length > 0
        ) {

            perspectivesHTML = `

                <div class="features-box">

                    <h3>
                        👁️ Perspective
                    </h3>

                    <p>
                        ${escapeHtml(
                            perspectives.join(", ")
                        )}
                    </p>

                </div>

            `;
        }

        // =================================================
        // KEYWORDS
        // =================================================

        let keywordsHTML = "";

        if (
            keywords.length > 0
        ) {

            keywordsHTML = `

                <div class="features-box">

                    <h3>
                        🏷️ Keywords
                    </h3>

                    <p>
                        ${escapeHtml(
                            keywords.join(", ")
                        )}
                    </p>

                </div>

            `;
        }

        // =================================================
        // SCREENSHOTS
        // =================================================

        let screenshotsHTML = "";

        if (
            screenshots.length > 0
        ) {

            screenshotsHTML = `

                <div class="features-box">

                    <h3>
                        📸 Screenshots
                    </h3>

                    <div class="screenshots">

                        ${screenshots
                            .slice(0, 6)
                            .map(
                                screenshot => `

                                    <img
                                        src="${escapeHtml(
                                            screenshot
                                        )}"
                                        alt="Game screenshot"
                                        loading="lazy"
                                        onerror="this.style.display='none'"
                                    >

                                `
                            )
                            .join("")}

                    </div>

                </div>

            `;
        }

        // =================================================
        // FINAL HTML
        // =================================================

        const html = `

            <div class="result-card">

                ${imageHTML}

                <div class="result-info">

                    <h2>
                        ${escapeHtml(title)}
                    </h2>

                    <p class="game-summary">
                        ${escapeHtml(summary)}
                    </p>

                    <div class="stats">

                        <div class="stat">

                            <small>
                                ⭐ Rating
                            </small>

                            <strong>
                                ${escapeHtml(
                                    rating
                                )}
                            </strong>

                        </div>

                        <div class="stat">

                            <small>
                                📝 IGDB Ratings
                            </small>

                            <strong>
                                ${escapeHtml(
                                    reviews
                                )}
                            </strong>

                        </div>

                        <div class="stat">

                            <small>
                                📥 Downloads
                            </small>

                            <strong>
                                ${escapeHtml(
                                    downloads
                                )}
                            </strong>

                        </div>

                        <div class="stat">

                            <small>
                                🎭 Genre
                            </small>

                            <strong>
                                ${escapeHtml(
                                    genre
                                )}
                            </strong>

                        </div>

                        <div class="stat">

                            <small>
                                🏢 Developer
                            </small>

                            <strong>
                                ${escapeHtml(
                                    developer
                                )}
                            </strong>

                        </div>

                        <div class="stat">

                            <small>
                                📅 Release
                            </small>

                            <strong>
                                ${escapeHtml(
                                    release
                                )}
                            </strong>

                        </div>

                        <div class="stat">

                            <small>
                                🏢 Publisher
                            </small>

                            <strong>
                                ${escapeHtml(
                                    publisher
                                )}
                            </strong>

                        </div>

                    </div>

                    ${googlePlayHTML}

                    <div class="features-box">

                        <h3>
                            ✨ Game Features
                        </h3>

                        <ul>

                            ${featuresHTML}

                        </ul>

                    </div>

                    ${platformsHTML}

                    ${modesHTML}

                    ${themesHTML}

                    ${perspectivesHTML}

                    ${keywordsHTML}

                    ${screenshotsHTML}

                    <div class="review-box">

                        <h3>
                            🤖 AI Review
                        </h3>

                        <p>
                            ${escapeHtml(
                                review
                            )}
                        </p>

                    </div>

                </div>

            </div>

        `;

        container.innerHTML =
            html;

        // =================================================
        // DEBUG
        // =================================================

        console.log(
            "🎮 Game:",
            title
        );

        console.log(
            "⭐ Rating:",
            rating
        );

        console.log(
            "📝 IGDB Ratings:",
            reviews
        );

        console.log(
            "📥 Downloads:",
            downloads
        );

        console.log(
            "🎭 Genre:",
            genre
        );

        console.log(
            "🏢 Developer:",
            developer
        );

        console.log(
            "📅 Release:",
            release
        );

        console.log(
            "📱 Google Play:",
            playAvailable
        );

        console.log(
            "💬 Play Reviews:",
            playReviews
        );

        console.log(
            "🤖 AI Review:",
            review
        );

        // =================================================
        // SCROLL
        // =================================================

        container.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {

        console.error(
            "❌ FRONTEND ERROR:",
            error
        );

        container.innerHTML = `

            <div class="error-box">

                <h2>
                    ❌ Unable to load review
                </h2>

                <p>
                    ${escapeHtml(
                        error.message
                    )}
                </p>

                <p>
                    Open the browser console
                    and terminal to see the
                    detailed error.
                </p>

            </div>

        `;

    } finally {

        btn.disabled = false;

        btn.textContent =
            "🔍 Search";
    }
}

// =====================================================
// IMAGE ERROR
// =====================================================

function handleImageError(img) {

    if (!img) {
        return;
    }

    img.onerror = null;

    if (
        img.parentElement
    ) {

        img.parentElement.innerHTML = `

            <div class="img-missing">

                🎮

                <br>

                Game cover unavailable

            </div>

        `;
    }
}

// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(text) {

    if (
        text === null ||
        text === undefined
    ) {

        return "";
    }

    return String(text)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}

// =====================================================
// ENTER KEY
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const input =
            document.getElementById(
                "gameInput"
            );

        if (!input) {

            console.error(
                "❌ gameInput not found."
            );

            return;
        }

        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    askAI();
                }
            }
        );

        console.log(
            "✅ Search input ready."
        );
    }
);