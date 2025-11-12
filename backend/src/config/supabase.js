const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
const dns = require('dns');

// Configuração do cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

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
    
    // Função para testar conectividade com retry
    async function testSupabaseConnection(retryCount = 0) {
      if (!supabaseClient) return false;
      
      try {
        // Verificar se conseguimos resolver o domínio do Supabase
        const supabaseDomain = new URL(supabaseUrl).hostname;
        
        try {
          // Tentar resolver o domínio usando DNS
          await new Promise((resolve, reject) => {
            dns.lookup(supabaseDomain, (err, address) => {
              if (err) {
                console.error(`⚠️ Erro de DNS ao resolver ${supabaseDomain}:`, err.message);
                reject(err);
              } else {
                console.log(`✅ Domínio ${supabaseDomain} resolvido para ${address}`);
                resolve(address);
              }
            });
          });
        } catch (dnsError) {
          // Se falhar na resolução de DNS, usar modo local
          console.error(`⚠️ Falha na resolução de DNS para ${supabaseDomain}. Usando modo local.`);
          supabaseConnected = false;
          return false;
        }
        
        // Tentar fazer uma requisição simples
        // Executa consulta simples com timeout manual (Promise.race)
        const queryPromise = supabaseClient
          .from('fornecedores')
          .select('count')
          .limit(1);

        const timeoutMs = 5000;
        const result = await Promise.race([
          queryPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
        ]);

        const { data, error } = result || {};
        
        if (error) {
          // Se for erro de conectividade e ainda temos tentativas, tentar novamente
          if ((error.message.includes('fetch failed') || 
               error.message.includes('network') || 
               error.message.includes('timeout')) && 
              retryCount < 2) {
            console.warn(`⚠️ Erro de conectividade com Supabase, tentativa ${retryCount + 1}/3:`, error.message);
            // Esperar um pouco antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 1000));
            return testSupabaseConnection(retryCount + 1);
          }
          
          if (!error.message.includes('relation "fornecedores" does not exist')) {
            console.warn('⚠️ Erro de conectividade com Supabase:', error.message);
            supabaseConnected = false;
            return false;
          }
        }
        
        console.log('✅ Conectividade com Supabase estabelecida com sucesso');
        supabaseConnected = true;
        return true;
      } catch (err) {
        console.warn('⚠️ Falha na conectividade com Supabase:', err.message);
        supabaseConnected = false;
        return false;
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
        return supabaseConnected;
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