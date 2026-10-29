import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Server-side Gemini initialization
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Available neural voices
const VOICES = [
  { id: 'Kore', name: 'Kore', gender: 'Femenino', desc: 'Cálida, clara y expresiva', lang: 'es-ES' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Masculino', desc: 'Profunda, narrativa y autoritaria', lang: 'es-ES' },
  { id: 'Puck', name: 'Puck', gender: 'Masculino', desc: 'Dinámica, ágil y conversacional', lang: 'es-ES' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'Femenino', desc: 'Serena, relajante y fluida', lang: 'es-ES' },
  { id: 'Charon', name: 'Charon', gender: 'Masculino', desc: 'Formal, pausada y académica', lang: 'es-ES' },
];

// Endpoint: List available voices
app.get('/api/voices', (_req, res) => {
  res.json({
    hasApiKey: Boolean(apiKey),
    voices: VOICES,
  });
});

// Endpoint: Synthesize Speech using Gemini 3.8 Flash Lite TTS
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Kore', stylePrompt } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Se requiere el texto a sintetizar' });
      return;
    }

    // Limit chunk length if needed for ultra-fast response
    const cleanText = text.trim();
    if (!cleanText) {
      res.status(400).json({ error: 'Texto vacío' });
      return;
    }

    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY no está configurada en el servidor. Puedes usar la síntesis de voz nativa del dispositivo como alternativa.',
        fallbackToNative: true,
      });
      return;
    }

    const voiceName = VOICES.some((v) => v.id === voice) ? voice : 'Kore';

    const promptStyle = stylePrompt || 'Natural, warm, engaging Spanish voice narrator, reading a document smoothly with natural pauses';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: promptStyle,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      res.status(500).json({
        error: 'No se recibió flujo de audio del modelo',
        fallbackToNative: true,
      });
      return;
    }

    // Return as audio/wav binary or JSON
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache audio chunk
    res.send(audioBuffer);
  } catch (error: unknown) {
    console.error('Error generating speech:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al sintetizar audio';
    res.status(500).json({
      error: errorMessage,
      fallbackToNative: true,
    });
  }
});

// Endpoint: Document summary / audio overview using Gemini 3.8 Flash
app.post('/api/summarize', async (req, res) => {
  try {
    const { text, title } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Texto no proporcionado' });
      return;
    }

    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY no disponible' });
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Eres un asistente de lectura de audiolibros. Genera una introducción concisa y cautivadora (en español, 2-3 párrafos cortos, unas 150-200 palabras) para ser escuchada antes de leer el documento. 
Título del documento: "${title || 'Documento PDF'}"
Texto:
${text.slice(0, 15000)}`,
      config: {
        systemInstruction: 'Genera solo el texto en prosa para locución, claro y natural, sin viñetas, sin títulos markdown ni asteriscos.',
      },
    });

    res.json({ summary: response.text });
  } catch (err: unknown) {
    console.error('Error in summarize:', err);
    res.status(500).json({ error: 'No se pudo generar el resumen' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', hasApiKey: Boolean(apiKey) });
});

// Setup Vite in development or static serve in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VozDoc server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
