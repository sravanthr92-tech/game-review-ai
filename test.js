import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

console.log("Testing Gemini API...");

const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text: "Say hello in one short sentence."
                        }
                    ]
                }
            ]
        })
    }
);

const data = await response.json();

console.log("HTTP STATUS:", response.status);
console.log(JSON.stringify(data, null, 2));