const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
const dns = require('dns');

// Configuração do cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const forceSupabase = process.env.FORCE_SUPABASE === 'true';

// Configurar DNS para usar servidores Google (8.8.8.8) e Cloudflare (1.1.1.1)
dns.setServers(['8.8.8.8', '1.1.1.1']);

// Configuração de agentes HTTP para lidar com problemas de conectividade
const httpAgent = new http.Agent({
  keepAlive: true,
  timeout: 10000, // 10 segundos de timeout
  maxSockets: 5
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  timeout: 10000, // 10 segundos de timeout
  maxSockets: 5,
  rejectUnauthorized: false // Permite certificados auto-assinados (use com cautela em produção)
});

// Validar se as configurações são válidas
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Estado de conectividade do Supabase
let supabaseConnected = false;
let supabaseClient = null;

if (!supabaseUrl || !supabaseKey || !isValidUrl(supabaseUrl) || supabaseUrl.includes('sua_url_do_supabase_aqui')) {
  console.warn('⚠️  Configurações do Supabase não encontradas ou inválidas. Usando modo de desenvolvimento local.');
  console.warn('💡 Para usar Supabase, configure SUPABASE_URL e SUPABASE_ANON_KEY no arquivo .env');
  module.exports = {
    supabase: null,
    isSupabaseConfigured: false,
    testSupabaseConnection: async () => false
  };
} else {
  try {
    // Implementando tratamento de erro para problemas de DNS
    
    // Configuração do cliente com opções de fetch personalizadas para lidar com problemas de rede
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false // Não persistir sessão para evitar problemas de cache
      },
      global: {
        fetch: (url, options) => {
          // Determinar qual agente usar com base no protocolo
          const agent = url.toString().startsWith('https:') ? httpsAgent : httpAgent;
          return fetch(url, { ...options, agent });
        }
      }
    });
    console.log('✅ Cliente Supabase configurado com sucesso com tratamento de erros de rede');
    
    // Função para testar conectividade com lógica simplificada e suporte a FORCE_SUPABASE
    async function testSupabaseConnection(retryCount = 0) {
      if (!supabaseClient) return false;
      if (forceSupabase) {
        supabaseConnected = true;
        return true;
      }

      try {
        const { error } = await supabaseClient
          .from('fornecedores')
          .select('id')
          .limit(1);

        if (error) {
          const msg = (error.message || '').toLowerCase();
          // Erros de rede: tentar novamente algumas vezes
          if ((msg.includes('fetch failed') || msg.includes('network') || msg.includes('timeout')) && retryCount < 2) {
            console.warn(`⚠️ Erro de rede Supabase, tentativa ${retryCount + 1}/3:`, error.message);
            await new Promise(r => setTimeout(r, 1000));
            return testSupabaseConnection(retryCount + 1);
          }
          // Se a tabela ainda não existir, considerar conectado (alcance ao serviço funcionando)
          if (msg.includes('relation') && msg.includes('does not exist')) {
            supabaseConnected = true;
            return true;
          }
          // Outros erros (ex.: RLS com anon sem permissões) — serviço responde, considerar conectado
          supabaseConnected = true;
          return true;
        }

        supabaseConnected = true;
        return true;
      } catch (err) {
        const msg = (err.message || '').toLowerCase();
        if (msg.includes('fetch failed') || msg.includes('network') || msg.includes('timeout')) {
          supabaseConnected = false;
          return false;
        }
        // Erros não relacionados a rede — considerar serviço alcançável
        supabaseConnected = true;
        return true;
      }
    }
    
    // Testar conectividade inicial
    testSupabaseConnection().catch(() => {
      console.warn('⚠️  Conectividade inicial com Supabase falhou. Usando fallback local.');
      supabaseConnected = false;
    });
    
    module.exports = {
      supabase: supabaseClient,
      isSupabaseConfigured: true,
      get isSupabaseConnected() {
        return forceSupabase ? true : supabaseConnected;
      },
      testSupabaseConnection
    };
  } catch (error) {
    console.error('❌ Erro ao configurar Supabase:', error.message);
    console.warn('⚠️  Usando modo de desenvolvimento local como fallback.');
    module.exports = {
      supabase: null,
      isSupabaseConfigured: false,
      testSupabaseConnection: async () => false
    };
  }
}
