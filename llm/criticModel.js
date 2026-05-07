require("dotenv").config();
const { ChatGroq } = require("@langchain/groq");

const criticModel = new ChatGroq({
  model: "llama-3.1-8b-instant",
  temperature: 0,
  apiKey: process.env.GROQ_API_KEY,
});

module.exports = { criticModel };