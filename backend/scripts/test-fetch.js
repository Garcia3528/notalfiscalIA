require('dotenv').config();
const https = require('https');
const http = require('http');
// Usando fetch nativo do Node.js
const { fetch } = globalThis;

// Configuração de agentes HTTP para lidar com problemas de conectividade
const httpAgent = new http.Agent({
  keepAlive: true,
  timeout: 10000,
  maxSockets: 5
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  timeout: 10000,
  maxSockets: 5,
  rejectUnauthorized: false
});

// URL do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

async function testFetch() {
  console.log('Testando conectividade com Supabase...');
  console.log(`URL: ${supabaseUrl}`);
  
  try {
    // Usando o agente HTTPS para a requisição
    const response = await fetch(`${supabaseUrl}/rest/v1/fornecedores?select=count`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      agent: supabaseUrl.startsWith('https:') ? httpsAgent : httpAgent,
      timeout: 10000
    });
    
    console.log('Status da resposta:', response.status);
    const data = await response.json();
    console.log('Dados recebidos:', data);
    console.log('✅ Teste de conectividade bem-sucedido!');
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    console.error('Detalhes do erro:', error);
    
    // Verificar se é um problema de proxy ou firewall
    console.log('\nVerificando configurações de rede...');
    try {
      // Testar conectividade com um serviço externo confiável
      console.log('Testando conectividade com api.github.com...');
      const testResponse = await fetch('https://api.github.com', {
        agent: httpsAgent,
        timeout: 5000
      });
      console.log('Conectividade externa: OK (status', testResponse.status, ')');
      console.log('O problema parece ser específico da conexão com o Supabase.');
    } catch (testError) {
      console.error('Erro na conectividade externa:', testError.message);
      console.log('Parece haver um problema geral de conectividade de rede.');
      console.log('Verifique sua conexão com a internet, configurações de proxy ou firewall.');
    }
  }
}

testFetch();