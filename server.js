require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 1. Initialize Express Server
const app = express();
const PORT = process.env.PORT || 3000;

// 2. Initialize Telegram Bot
const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
    console.error("Error: TELEGRAM_BOT_TOKEN is missing in environment variables.");
    process.exit(1);
}
const bot = new TelegramBot(botToken, { polling: true });

// 3. Initialize Gemini API
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
    console.error("Error: GEMINI_API_KEY is missing in environment variables.");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(geminiApiKey);

const systemInstruction = `You are a strict toxicity classification system.
Classify the given text into exactly one of the following:
NON_TOXIC, TOXIC, SEVERE_TOXIC, OBSCENE, THREAT, INSULT, HATE_SPEECH.

Return ONLY valid JSON in this format:
{
  "label": "CATEGORY_NAME",
  "confidence": 0.00
}

Do not explain anything.`;

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash", // Using the standard 2.0 flash model
    systemInstruction: systemInstruction,
});

// 4. Handle Incoming Telegram Messages
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Ignore non-text messages
    if (!text) return;

    try {
        // Send message to Gemini for classification
        const result = await model.generateContent(text);
        const responseText = result.response.text();

        // Clean Gemini response if wrapped in markdown blocks before parsing
        let cleanJsonStr = responseText.trim();
        if (cleanJsonStr.startsWith('```')) {
            cleanJsonStr = cleanJsonStr.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
        }

        // Parse JSON
        const classification = JSON.parse(cleanJsonStr);

        // Action based on classification
        if (classification.label !== 'NON_TOXIC') {
            try {
                // Delete the toxic message
                await bot.deleteMessage(chatId, msg.message_id);
            } catch (err) {
                console.error("Failed to delete message. The bot might need 'Delete Messages' admin rights.", err.message);
            }
            // Send a warning
            await bot.sendMessage(chatId, `⚠ Warning! A message was deleted for toxic content: ${classification.label}`);
        }

    } catch (error) {
        console.error("Error analyzing message:", error.message);
        // If Gemini fails or JSON parsing fails, reply: "Error analyzing message."
        await bot.sendMessage(chatId, "Error analyzing message.");
    }
});

// 5. Basic Express Health Check Route
app.get('/', (req, res) => {
    res.send('Toxicity Detection Bot Server is running.');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log("Telegram bot is polling for messages...");
});
