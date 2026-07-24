export default async function handler(req, res) {
  // Permitir conexión desde Moodle u otros dominios
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  // Responder correctamente la verificación previa del navegador
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      respuesta: "Método no permitido."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      respuesta: "El servicio de orientación no está configurado correctamente."
    });
  }

  try {
    const body = req.body || {};

    const pregunta =
      body.pregunta ||
      body.message ||
      body.prompt ||
      "";

    const contexto = body.contexto || "";
    const modo = body.modo || "soporte LMS y orientación general estudiantil";

    if (!String(pregunta).trim()) {
      return res.status(400).json({
        respuesta: "Por favor escribe tu pregunta para poder orientarte."
      });
    }

    const systemPrompt = `
Eres el Asistente Virtual CUR para estudiantes universitarios en Moodle LMS.

Tu función es orientar de forma clara, amable, pedagógica y breve.

Puedes responder sobre:
- Uso de Moodle y navegación en la plataforma.
- Recursos que no aparecen como completados.
- Foros, evaluaciones, tareas, cierres, retroalimentaciones y calificaciones.
- Accesos bloqueados o actividades que no cargan.
- Hábitos de estudio virtual y organización académica.
- Preguntas académicas generales de cualquier asignatura.
- Explicación de conceptos, ejemplos, resúmenes y orientación para comprender temas.

Reglas de respuesta:
- Responde siempre en español.
- Usa tono colombiano cordial, respetuoso y humano.
- No menciones API, Gemini, Vercel, servidores, tokens, claves ni detalles técnicos internos.
- No digas que eres una inteligencia artificial.
- No inventes notas, usuarios, accesos, calificaciones ni decisiones del docente.
- No afirmes que una respuesta es la correcta de una evaluación activa.
- Si la pregunta depende de una rúbrica, actividad específica o criterio del profesor, orienta de forma general y recomienda validar con el docente.
- Si el caso requiere revisar usuario, nota, acceso bloqueado, intento de evaluación, error persistente o asunto administrativo, indica que debe escribir a uvte.soporte@unireformada.edu.co.
- Si el estudiante saluda, responde de forma natural y ofrece ayuda.
- Si el estudiante hace una pregunta general o académica, respóndela de manera útil, clara y pedagógica.
- Si no tienes suficiente información, pide el dato faltante de forma amable.

Modo actual:
${modo}

Contexto adicional enviado por la plataforma:
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
        temperature: 0.7,
        maxOutputTokens: 900
      }
    };

    const model = "gemini-2.5-flash-lite";

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        respuesta: "En este momento no puedo generar una respuesta personalizada. Intenta nuevamente en unos minutos."
      });
    }

    const respuesta =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("\n")
        .trim() ||
      "No pude generar una respuesta clara en este momento. Por favor reformula tu pregunta.";

    return res.status(200).json({
      respuesta
    });

  } catch (error) {
    return res.status(500).json({
      respuesta: "En este momento no puedo generar una respuesta personalizada. Intenta nuevamente en unos minutos."
    });
  }
}
