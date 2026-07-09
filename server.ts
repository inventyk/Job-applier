import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not defined in the environment. Chatbot features will be unavailable.");
}
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

// API: Multi-turn Chat with Gemini Search Grounding
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is not configured. Please add it to your secrets." });
    }

    // Map history to Gemini API format
    // Gemini expects an array of content objects: { role: 'user' | 'model', parts: [{ text: '...' }] }
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      }
    }

    // Append the current message
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: `You are an expert Job Automation and Application Assistant.
Your goal is to help the user search for real, live job listings on LinkedIn, Indeed, Naukri, and other job boards, analyze job descriptions (JDs), and manage their job hunt.
When the user asks to search for a job, always use the Google Search tool to find actual, real-time job listings matching their criteria (job role, location, company, etc.).
Present the listings beautifully in Markdown, including the company name, job title, location, a brief summary of the skills required, and the application URL/link.
When presenting a job listing, also provide a clear button action or trigger (for our app UI) by adding a line like this at the end of each listing if the user might want to apply/track:
[Action: Track/Apply for "Job Title" at "Company Name" - Link: "URL" - Location: "Location"]

Guide the user through applying, selecting a resume from Google Drive, updating their tracking Google Sheet, and setting up tasks/interviews in Google Tasks and Calendar. Keep your tone highly professional, encouraging, and clear.`,
        tools: [{ googleSearch: {} }],
      },
    });

    const reply = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // Map grounding chunks to clean source links
    const sources = groundingChunks
      .map((chunk: any) => {
        if (chunk.web) {
          return {
            title: chunk.web.title,
            uri: chunk.web.uri,
          };
        }
        return null;
      })
      .filter(Boolean);

    res.json({ reply, sources });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "An error occurred during chat processing." });
  }
});

// API: Analyze Job Description (Extract structured fields using Gemini)
app.post("/api/analyze-jd", async (req, res) => {
  try {
    const { jdText, jobUrl, jobTitle, companyName, location } = req.body;
    if (!jdText) {
      return res.status(400).json({ error: "Job description text is required" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is not configured." });
    }

    const prompt = `Analyze the following job description (JD) and extract the structured details.
If any details are not explicitly mentioned, use reasonable inference or set them to "Not mentioned".
Input Details (if provided, use these as priority):
- Title: ${jobTitle || "Not provided"}
- Company: ${companyName || "Not provided"}
- URL: ${jobUrl || "Not provided"}
- Location: ${location || "Not provided"}

Job Description text to analyze:
"""
${jdText}
"""

Return the output in STRICT JSON format with the following schema:
{
  "companyName": "The name of the company",
  "jobRole": "The job title / role",
  "interviewDate": "Set to current date or leave empty",
  "mode": "Remote / On-site / Hybrid / Not mentioned",
  "link": "The URL/link of the job",
  "location": "The job location (city, state, country, or Remote)",
  "skillsBrief": "A brief paragraph summarizing the key job responsibilities and the required/preferred skills highlighted in the JD.",
  "skillsList": ["Skill 1", "Skill 2", "Skill 3"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    let resultText = response.text || "{}";
    // clean markdown formatting if any
    resultText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(resultText);
      res.json(parsed);
    } catch (parseError) {
      console.error("JSON parse error on text:", resultText);
      res.json({
        companyName: companyName || "Extracted Company",
        jobRole: jobTitle || "Extracted Role",
        interviewDate: "",
        mode: "Not mentioned",
        link: jobUrl || "",
        location: location || "Not mentioned",
        skillsBrief: "Failed to parse structured details. Standard application tracked.",
        skillsList: [],
      });
    }
  } catch (error: any) {
    console.error("Error in /api/analyze-jd:", error);
    res.status(500).json({ error: error.message || "An error occurred during JD analysis." });
  }
});

// Setup Vite Dev Server / Static Files Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode serving built assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
