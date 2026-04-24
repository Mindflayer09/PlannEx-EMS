// backend/services/aiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelName = (process.env.AI_MODEL_NAME || "gemini-3-flash-preview").trim();
const modelConfig = { model: modelName };
if (modelName.toLowerCase().includes('gemini')) {
  modelConfig.generationConfig = { responseMimeType: "application/json" };
}
const model = genAI.getGenerativeModel(modelConfig);

const generateWithRetry = async (prompt, maxRetries = 5) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[AI SERVICE] Attempt ${attempt}/${maxRetries} to generate content...`);
      const result = await model.generateContent(prompt);
      console.log(`[AI SERVICE] ✅ Content generated successfully on attempt ${attempt}`);
      return result;
    } catch (error) {
      const is503Error = error.status === 503 || error.message?.includes('503') || error.message?.includes('Service Unavailable');
      const isRateLimitError = error.status === 429 || error.message?.includes('429');
      
      console.error(`[AI SERVICE] Error on attempt ${attempt}:`, {
        status: error.status,
        is503: is503Error,
        isRateLimit: isRateLimitError
      });

      if ((is503Error || isRateLimitError) && attempt < maxRetries) {
        let delay;

        if (isRateLimitError) {
          delay = 60000;
          const delayMatch = error.message.match(/retryDelay":"(\d+)s"/);
          const altMatch = error.message.match(/retry in (\d+\.?\d*)s/);

          if (delayMatch && delayMatch[1]) {
            delay = (parseInt(delayMatch[1], 10) + 2) * 1000; // Add 2-second buffer
          } else if (altMatch && altMatch[1]) {
            delay = (Math.ceil(parseFloat(altMatch[1])) + 2) * 1000; // Add 2-second buffer
          }
        } else {
          const baseDelay = Math.pow(2, attempt) * 1000;
          const jitter = Math.random() * 1000;
          delay = baseDelay + jitter;
        }
        
        console.warn(
          `[AI SERVICE] API overloaded (${error.status || '429/503'}). Server sleeping for ${Math.round(delay / 1000)}s to respect limits...`
          + ` (Attempt ${attempt + 1}/${maxRetries})`
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      console.error(`[AI SERVICE] ❌ Fatal error on attempt ${attempt}:`, error.message);
      throw error;
    }
  }

  throw new Error(`Failed to generate content after ${maxRetries} attempts. API service is overwhelmed.`);
};
module.exports = { generateWithRetry };