console.log("✅ script.js loaded");

async function askAI() {

    const input =
        document.getElementById("gameInput");

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

    btn.disabled = true;

    btn.textContent =
        "🔄 Searching...";

    container.innerHTML = `
        <div class="welcome">
            <h2>
                🔍 Searching for
                ${escapeHtml(game)}...
            </h2>

            <p>
                Getting game information
                and generating AI review...
            </p>
        </div>
    `;

    try {

        const response =
            await fetch(
                "/review",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        game
                    })
                }
            );

        const data =
            await response.json();

        console.log(
            "📦 Server response:",
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

        const g =
            data.game || {};

        const ai =
            data.ai || {};

        // ========================================
        // DATA
        // ========================================

        const title =
            g.title ||
            game;

        const image =
            g.image ||
            ai.image ||
            "";

        const rating =
            g.rating ??
            "N/A";

        const reviews =
            g.reviews ??
            "Not available";

        // ========================================
        // DOWNLOAD TEXT
        // ========================================

        const downloads =
            "More than 50M+";

        const genre =
            g.genre ||
            "Unknown";

        const developer =
            g.developer ||
            "Unknown";

        const release =
            g.release ||
            "Unknown";

        const review =
            ai.review ||
            "No AI review available.";

        let features =
            Array.isArray(
                ai.features
            )
                ? ai.features
                : [];

        features =
            features.slice(0, 5);

        while (
            features.length < 5
        ) {

            features.push(
                "Information unavailable"
            );
        }

        // ========================================
        // IMAGE
        // ========================================

        let imageHTML = "";

        if (image) {

            imageHTML = `
                <div class="cover">

                    <img
                        src="${escapeHtml(image)}"
                        alt="${escapeHtml(title)} cover"
                        onerror="handleImageError(this)"
                    >

                </div>
            `;

        } else {

            imageHTML = `
                <div class="cover missing">

                    <div class="img-missing">
                        🎮 Game cover unavailable
                    </div>

                </div>
            `;
        }

        // ========================================
        // RESULT CARD
        // ========================================

        let html = `

            <div class="result-card">

                ${imageHTML}

                <div class="result-info">

                    <h2>
                        ${escapeHtml(title)}
                    </h2>

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
                                📝 Reviews
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
                                🎮 Genre
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

                    </div>

                    <div class="features-box">

                        <h3>
                            ✨ Game Features
                        </h3>

                        <ul>
        `;

        features.forEach(
            feature => {

                html += `
                    <li>
                        ${escapeHtml(
                            feature
                        )}
                    </li>
                `;
            }
        );

        html += `

                        </ul>

                    </div>

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

        console.log(
            "⭐ Rating:",
            rating
        );

        console.log(
            "📝 Reviews:",
            reviews
        );

        console.log(
            "📥 Downloads:",
            downloads
        );

        console.log(
            "🎮 Genre:",
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

        container.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {

        console.error(
            "❌ Frontend error:",
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

            </div>
        `;

    } finally {

        btn.disabled = false;

        btn.textContent =
            "🔍 Search";
    }
}

// ============================================
// IMAGE ERROR
// ============================================

function handleImageError(img) {

    img.onerror = null;

    img.parentElement.innerHTML = `
        <div class="img-missing">
            🎮 Game cover unavailable
        </div>
    `;
}

// ============================================
// ESCAPE HTML
// ============================================

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

// ============================================
// ENTER KEY
// ============================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const input =
            document.getElementById(
                "gameInput"
            );

        if (!input) {
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
    }
);