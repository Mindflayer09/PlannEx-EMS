// backend/services/aiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini (Make sure your API key is in your .env!)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// The Exponential Backoff Helper Function
const generateWithRetry = async (prompt, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result;
    } catch (error) {
      if (error.message.includes('503') && attempt < maxRetries) {
        console.warn(`Gemini API busy. Retrying attempt ${attempt + 1}/${maxRetries} in a few seconds...`);
        const delay = attempt * 2000; // 2s, 4s, 6s...
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};
module.exports = { generateWithRetry };