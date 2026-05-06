require("dotenv").config();
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

async function main() {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-3-flash-preview",
    temperature: 0,
    apiKey: process.env.GOOGLE_API_KEY,
  });

  const response = await model.invoke("Say only: Gemini connected");
  console.log(response.content);
}

main().catch(console.error);