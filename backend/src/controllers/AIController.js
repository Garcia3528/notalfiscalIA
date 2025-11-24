const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIController {
  async testGemini(req, res) {
    try {
      const disableAI = process.env.DISABLE_AI === 'true';
      if (disableAI) {
        return res.status(200).json({ ok: false, message: 'IA desativada por configuração (DISABLE_AI=true)' });
      }

      const apiKey = req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ ok: false, message: 'GEMINI_API_KEY ausente' });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

      // Tenta gerar um conteúdo simples
      const result = await model.generateContent('Responda apenas com OK');
      const response = await result.response;
      const text = (response && typeof response.text === 'function') ? response.text() : '';
      const ok = /ok/i.test(text || '');

      return res.status(200).json({ ok, message: ok ? 'Gemini conectado' : 'Resposta inesperada', raw: text });
    } catch (error) {
      // Refina erros para facilitar diagnóstico
      const msg = error?.message || 'Erro ao testar Gemini';
      let code = 500;
      if (/503|overloaded|service unavailable/i.test(msg)) code = 503;
      else if (/timeout/i.test(msg)) code = 504;
      else if (/invalid|unauthorized|forbidden|key/i.test(msg)) code = 401;
      return res.status(code).json({ ok: false, message: msg });
    }
  }
}

module.exports = AIController;