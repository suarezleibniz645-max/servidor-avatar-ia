export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Falta configurar GEMINI_API_KEY en las variables de entorno."
    });
  }

  try {
    const { pregunta = "", contexto = "", modo = "tutor" } = req.body || {};

    if (!pregunta.trim()) {
      return res.status(400).json({ error: "La pregunta está vacía." });
    }

    const systemPrompt = `
Eres un tutor educativo dentro de un recurso HTML/SCORM.
Responde en español claro, breve y pedagógico.
No menciones API, servidores, claves, tokens ni detalles técnicos internos.
Si el estudiante pregunta algo fuera del contenido, redirígelo amablemente al tema del recurso.
Cuando sea útil, da ejemplos cortos.
Modo actual: ${modo}
Contexto del recurso:
${contexto || "No se proporcionó contexto específico."}
`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}\n\nPregunta del estudiante:\n${pregunta}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 650
      }
    };

    const model = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return res.status(geminiResponse.status).json({
        error: "Gemini respondió con error.",
        details: data
      });
    }

    const respuesta =
      data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\n").trim()
      || "No pude generar una respuesta en este momento.";

    return res.status(200).json({ respuesta });
  } catch (error) {
    return res.status(500).json({
      error: "Error interno del servidor.",
      details: String(error?.message || error)
    });
  }
}
