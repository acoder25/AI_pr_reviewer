require("dotenv").config();
const { ChatGoogle } = require("@langchain/google");

const model = new ChatGoogle({
  model: "gemini-3-flash-preview",
  temperature: 0,
  maxRetries: 2,
  apiKey: process.env.GOOGLE_API_KEY,
});

module.exports = { model };