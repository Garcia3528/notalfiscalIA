const https = require('https');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY não encontrada no .env');
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.error) {
        console.error('Erro na API:', json.error);
        process.exit(1);
      }
      const models = json.models || [];
      console.log(`Modelos disponíveis (${models.length}):`);
      for (const m of models) {
        console.log(`- ${m.name} | ${m.displayName || ''}`);
      }
    } catch (e) {
      console.error('Falha ao parsear resposta:', e.message);
      console.log('Resposta bruta:', data);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('Erro na requisição:', err.message);
  process.exit(1);
});