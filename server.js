require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Hugging Face model mapping for detected emotions
const emotionToEmoji = {
    "anger": "😡",
    "disgust": "🤢",
    "fear": "😨",
    "joy": "😊",
    "neutral": "😐",
    "sadness": "😢",
    "surprise": "😲"
};

const HF_API_URL = "https://router.huggingface.co/hf-inference/models/j-hartmann/emotion-english-distilroberta-base";

app.post('/predict', async (req, res) => {
    const text = req.body.text;
    
    if (!text || text.trim() === "") {
        return res.status(400).json({ error: "Input text cannot be empty." });
    }

    try {
        // Construct headers (if user supplied an API token in .env, use it; otherwise proceed without one but beware of rate limits)
        const headers = {};
        if (process.env.HF_API_KEY) {
            headers["Authorization"] = `Bearer ${process.env.HF_API_KEY}`;
        }
        
        // Call Hugging Face Inference API
        const response = await axios.post(
            HF_API_URL,
            { inputs: text },
            { headers }
        );

        // API returns a 2D array of predictions: [[ {label: 'joy', score: 0.9}, ... ]]
        const predictions = response.data[0];
        
        if (predictions && predictions.length > 0) {
            // Find the emotion with the highest score
            const topEmotion = predictions.reduce((prev, current) => 
                (prev.score > current.score) ? prev : current
            );
            
            // Get the corresponding emoji
            const emoji = emotionToEmoji[topEmotion.label] || "🤔";
            
            res.json({ emoji: emoji });
        } else {
            res.status(500).json({ error: "No prediction received from the model." });
        }

    } catch (error) {
        console.error("Hugging Face API Error:", error.response ? error.response.data : error.message);
        
        let errorMsg = "Could not reach the Hugging Face API.";
        
        // Enhance error message if the model is loading or rate limit hit
        if (error.response) {
            if (error.response.status === 503) {
                errorMsg = "The model is currently loading on Hugging Face servers. Please try again in 10 seconds!";
            } else if (error.response.status === 401) {
                errorMsg = "Unauthorized request. It is recommended to create a .env file with your HF_API_KEY.";
            } else if (error.response.status === 429) {
                errorMsg = "Rate limit exceeded. Please add a Hugging Face API Key to your .env file.";
            }
        }
        
        res.status(500).json({ error: errorMsg });
    }
});

app.get('/suggest', async (req, res) => {
    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
             return res.status(500).json({ error: "Groq API key is missing. Please configure GROQ_API_KEY in .env" });
        }
        
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: "You generate short, 1-sentence expressive statements (e.g. happy, sad, angry) that a user could type into an emotion-to-emoji predictor. Only return the sentence, nothing else. Do not use quotes." },
                    { role: "user", content: "Give me a random expression sentence." }
                ],
                max_tokens: 30,
                temperature: 0.9
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        let suggestion = response.data.choices[0].message.content.trim();
        // Remove surrounding quotes if Groq generated them
        suggestion = suggestion.replace(/^["']|["']$/g, '');
        res.json({ suggestion });
    } catch(err) {
        console.error("Groq API Error:", err.response ? err.response.data : err.message);
        res.status(500).json({ error: "Failed to fetch suggestion from Groq." });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
