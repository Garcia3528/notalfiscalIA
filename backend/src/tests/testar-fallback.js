// Script simplificado para testar o mecanismo de fallback e retry
const ClassificacaoService = require('../services/ClassificacaoService');

// Sobrescreve o método de classificação por keywords para simular um resultado específico
ClassificacaoService.prototype.classificarPorKeywords = async function(dados) {
  console.log('✅ Simulando classificação por keywords para teste');
  return {
    categoria: 'MANUTENÇÃO E OPERAÇÃO',
    subcategoria: 'Combustíveis',
    confianca: 0.6, // Confiança média para forçar o uso da IA
    motivo: 'Classificação por keywords simulada para teste',
    fonte: 'keywords_simulado'
  };
};

// Sobrescreve o método de classificação por padrões avançados para simular um resultado específico
ClassificacaoService.prototype.classificarPorPadroesAvancados = function(dados) {
  console.log('✅ Simulando classificação por padrões avançados para teste');
  return {
    categoria: 'MANUTENÇÃO E OPERAÇÃO',
    subcategoria: 'Combustíveis',
    confianca: 0.7,
    motivo: 'Classificação por padrões avançados simulada para teste',
    fonte: 'padrao_avancado_simulado'
  };
};

// Simula uma API do Gemini que falha
class GeminiSimulado {
  constructor(falharQuantasVezes = 2) {
    this.falhasRestantes = falharQuantasVezes;
    this.chamadas = 0;
  }

  async generateContent(prompt) {
    this.chamadas++;
    console.log(`Chamada #${this.chamadas} ao Gemini simulado`);
    
    if (this.falhasRestantes > 0) {
      this.falhasRestantes--;
      const erro = new Error('[GoogleGenerativeAI Error]: Error fetching: [503 Service Unavailable] The model is overloaded. Please try again later.');
      erro.status = 503;
      console.log('Simulando falha do Gemini:', erro.message);
      throw erro;
    }
    
    // Simula uma resposta bem-sucedida após as falhas
    console.log('Simulando resposta bem-sucedida do Gemini');
    return {
      response: {
        text: () => JSON.stringify({
          categoria: "MANUTENÇÃO E OPERAÇÃO",
          subcategoria: "Combustíveis",
          confianca: 0.85,
          motivo: "Identificado como abastecimento de combustível",
          palavras_chave: ["diesel", "combustível", "posto"],
          tentativas: this.chamadas
        })
      }
    };
  }
}

// Despesa de exemplo para teste
const despesaExemplo = {
  descricao: "POSTO IPIRANGA - ABASTECIMENTO DIESEL S10",
  fornecedor: "AUTO POSTO IPIRANGA",
  valor: "350.00",
  data: "2023-05-15"
};

async function testarFallbackERetry() {
  console.log('=== TESTANDO MECANISMO DE FALLBACK E RETRY ===');
  
  // Teste 1: Gemini falha 2 vezes e depois funciona (testa retry)
  console.log('\n--- Teste 1: Gemini falha 2 vezes e depois funciona ---');
  const servicoComRetry = new ClassificacaoService();
  servicoComRetry.geminiModel = new GeminiSimulado(2); // Falha 2 vezes
  
  try {
    console.log('🔍 Classificando despesa...');
    const resultado = await servicoComRetry.classificarDespesa(despesaExemplo);
    console.log('Resultado final:', resultado);
    console.log('Retry funcionou? ' + (resultado.tentativas > 1 ? 'SIM ✅' : 'NÃO ❌'));
  } catch (erro) {
    console.error('Erro no teste 1:', erro);
    console.log('Retry falhou ❌');
  }
  
  // Teste 2: Gemini falha todas as vezes (testa fallback)
  console.log('\n--- Teste 2: Gemini falha todas as vezes ---');
  const servicoComFallback = new ClassificacaoService();
  servicoComFallback.geminiModel = new GeminiSimulado(5); // Falha mais vezes que o número de retries
  
  try {
    console.log('🔍 Classificando despesa (deve falhar e usar fallback)...');
    const resultado = await servicoComFallback.classificarDespesa(despesaExemplo);
    console.log('Resultado final:', resultado);
    console.log('Fallback funcionou? ' + (resultado.fonte === 'padrao_avancado_simulado' ? 'SIM ✅' : 'NÃO ❌'));
  } catch (erro) {
    console.error('Erro no teste 2:', erro);
    console.log('Fallback falhou ❌');
  }
  
  // Teste 3: Gemini desativado (testa fallback direto)
  console.log('\n--- Teste 3: Gemini desativado ---');
  const servicoSemGemini = new ClassificacaoService();
  servicoSemGemini.geminiModel = null; // Simula Gemini desativado
  
  try {
    console.log('🔍 Classificando despesa (Gemini desativado)...');
    const resultado = await servicoSemGemini.classificarDespesa(despesaExemplo);
    console.log('Resultado final:', resultado);
    console.log('Fallback direto funcionou? ' + (resultado.fonte === 'padrao_avancado_simulado' ? 'SIM ✅' : 'NÃO ❌'));
  } catch (erro) {
    console.error('Erro no teste 3:', erro);
    console.log('Fallback direto falhou ❌');
  }
}

// Executa os testes
testarFallbackERetry()
  .then(() => console.log('\n=== TESTES CONCLUÍDOS ==='))
  .catch(erro => console.error('Erro nos testes:', erro));