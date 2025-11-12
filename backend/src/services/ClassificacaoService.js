const { GoogleGenerativeAI } = require('@google/generative-ai');

class ClassificacaoService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    
    // Categorias padrão de despesas
    this.categorias = {
      'ALIMENTACAO': {
        nome: 'Alimentação',
        descricao: 'Restaurantes, lanchonetes, delivery, supermercados',
        keywords: ['restaurante', 'lanchonete', 'padaria', 'supermercado', 'delivery', 'ifood', 'uber eats']
      },
      'TRANSPORTE': {
        nome: 'Transporte',
        descricao: 'Combustível, táxi, uber, transporte público',
        keywords: ['posto', 'combustivel', 'gasolina', 'uber', 'taxi', 'onibus', 'metro']
      },
      'ESCRITORIO': {
        nome: 'Material de Escritório',
        descricao: 'Papelaria, equipamentos, móveis de escritório',
        keywords: ['papelaria', 'caneta', 'papel', 'impressora', 'computador', 'mesa', 'cadeira']
      },
      'TECNOLOGIA': {
        nome: 'Tecnologia',
        descricao: 'Software, hardware, serviços de TI',
        keywords: ['software', 'licenca', 'microsoft', 'google', 'amazon', 'servidor', 'hosting']
      },
      'MARKETING': {
        nome: 'Marketing e Publicidade',
        descricao: 'Anúncios, materiais promocionais, eventos',
        keywords: ['facebook ads', 'google ads', 'publicidade', 'marketing', 'evento', 'banner']
      },
      'SERVICOS_PROFISSIONAIS': {
        nome: 'Serviços Profissionais',
        descricao: 'Consultoria, advocacia, contabilidade',
        keywords: ['consultoria', 'advogado', 'contador', 'auditoria', 'juridico']
      },
      'MANUTENCAO': {
        nome: 'Manutenção e Reparos',
        descricao: 'Reparos, manutenção de equipamentos',
        keywords: ['manutencao', 'reparo', 'conserto', 'assistencia', 'tecnica']
      },
      'UTILIDADES': {
        nome: 'Utilidades',
        descricao: 'Energia, água, telefone, internet',
        keywords: ['energia', 'luz', 'agua', 'telefone', 'internet', 'celular']
      },
      'OUTROS': {
        nome: 'Outros',
        descricao: 'Despesas não categorizadas',
        keywords: []
      }
    };
  }

  /**
   * Classifica uma despesa usando palavras-chave e IA
   */
  async classificarDespesa(dados) {
    console.log('🔍 Classificando despesa...');
    const preferirIA = process.env.PREFER_AI === 'true';

    // Quando preferir IA, tenta primeiro com IA e retorna se for suficientemente confiável
    if (preferirIA) {
      try {
        console.log('🤖 Preferência configurada para IA (PREFER_AI=true). Tentando IA primeiro...');
        const tentativaIAInicial = await this.classificarComIA(dados);
        if (tentativaIAInicial && tentativaIAInicial.categoria && tentativaIAInicial.confianca >= 0.6) {
          console.log('✅ IA retornou classificação com boa confiança. Usando resultado da IA.');
          return tentativaIAInicial;
        }
        console.log('ℹ️ IA inicial não atingiu confiança mínima. Continuando com fluxo híbrido.');
      } catch (e) {
        console.warn('⚠️ Falha ao tentar IA inicialmente:', e.message);
      }
    }
    
    // Primeiro tenta classificar por keywords com a lógica melhorada
    const classificacaoPorKeywords = this.classificarPorKeywords(dados);
    console.log('✅ Classificação por keywords:', classificacaoPorKeywords);

    // Nova etapa: tentar classificação baseada no fornecedor
    const classificacaoPorFornecedor = this.classificarPorFornecedor(dados);
    console.log('✅ Classificação por fornecedor:', classificacaoPorFornecedor);

    // Se o fornecedor indicar uma categoria forte (não OUTROS) com boa confiança, prioriza
    if (classificacaoPorFornecedor.categoria !== 'OUTROS' && classificacaoPorFornecedor.confianca >= 0.7) {
      console.log('✅ Prioridade ao fornecedor: categoria identificada pelo fornecedor');
      return classificacaoPorFornecedor;
    }

    // Se a confiança for alta e não for OUTROS, retorna imediatamente
    if (classificacaoPorKeywords.confianca > 0.7 && classificacaoPorKeywords.categoria !== 'OUTROS') {
      console.log('✅ Confiança alta na classificação por keywords, retornando');
      return classificacaoPorKeywords;
    }
    
    // Tenta classificação por padrões avançados antes de usar IA
    if (classificacaoPorKeywords.categoria === 'OUTROS' || classificacaoPorKeywords.confianca < 0.5) {
      const classificacaoPorPadroes = this.classificarPorPadroesAvancados(dados);
      
      // Se a classificação por padrões for diferente de OUTROS, usa ela
      if (classificacaoPorPadroes.categoria !== 'OUTROS' && classificacaoPorPadroes.confianca > 0.6) {
        console.log('✅ Classificação por padrões avançados encontrou categoria:', classificacaoPorPadroes.categoria);
        return classificacaoPorPadroes;
      }
    }
    
    // Se ainda for OUTROS ou tiver baixa confiança, tenta com IA
    if (classificacaoPorKeywords.categoria === 'OUTROS' || classificacaoPorKeywords.confianca < 0.5) {
      try {
        console.log('🤖 Tentando classificação com IA...');
        const classificacaoIA = await this.classificarComIA(dados);
        console.log('✅ Classificação com IA:', classificacaoIA);
        
        // Se a IA retornou uma categoria com alta confiança, usa ela
        if (classificacaoIA.confianca > 0.7) {
          console.log('✅ Confiança alta na classificação com IA, retornando');
          return classificacaoIA;
        }
        
        // Se ambas classificações resultaram em OUTROS, tenta uma abordagem híbrida
        if (classificacaoPorKeywords.categoria === 'OUTROS' && classificacaoIA.categoria === 'OUTROS') {
          console.log('⚠️ Ambas classificações resultaram em OUTROS, tentando análise contextual...');
          
          // Análise contextual baseada em padrões comuns em notas fiscais
          const resultado = this.analisarContextualmente(dados, classificacaoPorKeywords, classificacaoIA);
          if (resultado.categoria !== 'OUTROS') {
            console.log('✅ Análise contextual encontrou categoria:', resultado.categoria);
            return resultado;
          }
        }
        
        // Combina os resultados, priorizando a classificação não-OUTROS
        if (classificacaoIA.categoria !== 'OUTROS' && classificacaoPorKeywords.categoria === 'OUTROS') {
          console.log('✅ Priorizando classificação da IA (não-OUTROS)');
          return classificacaoIA;
        }
        
        if (classificacaoPorKeywords.categoria !== 'OUTROS' && classificacaoIA.categoria === 'OUTROS') {
          console.log('✅ Mantendo classificação por keywords (não-OUTROS)');
          return classificacaoPorKeywords;
        }
        
        // Se a IA tiver mais confiança, usa ela
        if (classificacaoIA.confianca > classificacaoPorKeywords.confianca) {
          console.log('✅ Usando classificação da IA (maior confiança)');
          return classificacaoIA;
        }
        
        // Combina os resultados
        return this.combinarResultados(classificacaoPorKeywords, classificacaoIA);
        
      } catch (error) {
        console.error('❌ Erro ao classificar com IA:', error);
        // Melhora a mensagem de erro com mais detalhes
        let mensagemErro = 'Erro na análise com IA';
        
        // Verifica se é um erro de sobrecarga
        if (error.message && (error.message.includes('503') || 
            error.message.includes('overloaded') || 
            error.message.includes('Service Unavailable'))) {
          mensagemErro = 'Serviço de IA temporariamente sobrecarregado';
          console.log('⚠️ ' + mensagemErro + ', usando classificação alternativa');
        }
        
        // Adiciona informações de erro ao resultado
        classificacaoPorKeywords.erro_ia = mensagemErro;
        classificacaoPorKeywords.usou_fallback = true;
      }
    }
    
    // Caso nenhuma das tentativas anteriores tenha sucesso, retorna a classificação por keywords
    console.log('✅ Usando classificação por keywords (fallback)');
    return classificacaoPorKeywords;
  }
  
  /**
   * Realiza análise contextual para casos difíceis de classificar
   */
  analisarContextualmente(dados, classKeywords, classIA) {
    // Extrai texto para análise
    const texto = this.extrairTextoParaAnalise(dados);
    const textoLower = texto.toLowerCase();
    
    // Padrões específicos para categorias comuns que podem ser classificadas como OUTRAS
    const padroes = [
      // Padrão para despesas de alimentação
      {
        categoria: 'ADMINISTRATIVAS',
        subcategoria: 'Alimentação',
        padroes: ['restaurante', 'lanchonete', 'refeição', 'refeicao', 'almoço', 'almoco', 'jantar', 'café', 'cafe'],
        confianca: 0.7
      },
      // Padrão para material de escritório
      {
        categoria: 'ADMINISTRATIVAS',
        subcategoria: 'Material de Escritório',
        padroes: ['papelaria', 'escritório', 'escritorio', 'caneta', 'papel', 'impressão', 'impressao', 'toner'],
        confianca: 0.7
      },
      // Padrão para hospedagem
      {
        categoria: 'ADMINISTRATIVAS',
        subcategoria: 'Hospedagem',
        padroes: ['hotel', 'pousada', 'hospedagem', 'diária', 'diaria', 'estadia'],
        confianca: 0.7
      },
      // Padrão para serviços de TI
      {
        categoria: 'ADMINISTRATIVAS',
        subcategoria: 'Serviços de TI',
        padroes: ['software', 'sistema', 'informática', 'informatica', 'computador', 'tecnologia', 'ti ', 'backup'],
        confianca: 0.7
      },
      // Padrão para peças e acessórios
      {
        categoria: 'MANUTENÇÃO E OPERAÇÃO',
        subcategoria: 'Peças e Acessórios',
        padroes: ['peça', 'peca', 'acessório', 'acessorio', 'componente', 'reparo', 'conserto'],
        confianca: 0.7
      },
      // Padrão para ferramentas
      {
        categoria: 'MANUTENÇÃO E OPERAÇÃO',
        subcategoria: 'Ferramentas',
        padroes: ['ferramenta', 'equipamento', 'máquina', 'maquina', 'implemento'],
        confianca: 0.7
      }
    ];
    
    // Verifica se o texto contém algum dos padrões
    for (const padrao of padroes) {
      for (const termo of padrao.padroes) {
        if (textoLower.includes(termo)) {
          return {
            categoria: padrao.categoria,
            subcategoria: padrao.subcategoria,
            confianca: padrao.confianca,
            motivo: `Análise contextual identificou padrão "${termo}" associado à categoria ${padrao.categoria}`,
            fonte: 'analise_contextual'
          };
        }
      }
    }
    
    // Análise de valores
    const valor = parseFloat(dados.valor || '0');
    if (valor > 10000) {
      // Valores altos geralmente são investimentos ou insumos
      return {
        categoria: 'INVESTIMENTOS',
        subcategoria: 'Aquisição de Alto Valor',
        confianca: 0.5,
        motivo: `Valor alto (${valor}) sugere um investimento ou aquisição significativa`,
        fonte: 'analise_valor'
      };
    }
    
    // Se não encontrou nenhum padrão, retorna a melhor classificação entre keywords e IA
    if (classIA && classIA.confianca >= 0.4) {
      return classIA;
    }
    
    return classKeywords;
  }

  /**
   * Classifica usando palavras-chave
   */
  classificarPorKeywords(dados) {
    const texto = this.extrairTextoParaAnalise(dados).toLowerCase();
    const pontuacoes = {};
    const palavrasEncontradas = {};

    // Calcula pontuação para cada categoria
    Object.keys(this.categorias).forEach(categoria => {
      const keywords = this.categorias[categoria].keywords;
      let pontos = 0;
      const keywordsEncontradas = [];
      
      keywords.forEach(keyword => {
        if (texto.includes(keyword.toLowerCase())) {
          // Pontuação fixa para cada keyword encontrada
          pontos += 1;
          keywordsEncontradas.push(keyword);
        }
      });
      
      // Não atribuir pontos para a categoria OUTROS
      if (categoria === 'OUTROS') {
        pontos = 0;
      }
      
      pontuacoes[categoria] = pontos;
      palavrasEncontradas[categoria] = keywordsEncontradas;
    });

    // Encontra a categoria com maior pontuação
    let melhorCategoria = Object.keys(pontuacoes).reduce((a, b) => 
      pontuacoes[a] > pontuacoes[b] ? a : b
    );

    const maxPontos = pontuacoes[melhorCategoria];
    
    // Se não houver pontos para nenhuma categoria, tenta classificar por padrões básicos
    if (maxPontos === 0) {
      // Padrões básicos para categorias comuns
      const padroesBasicos = [
        { regex: /restaurante|lanchonete|refeição|almoço|café|lanche/i, categoria: 'ALIMENTACAO' },
        { regex: /combustível|gasolina|diesel|uber|táxi|transporte|viagem/i, categoria: 'TRANSPORTE' },
        { regex: /papel|caneta|escritório|impressora|toner|cartucho/i, categoria: 'ESCRITORIO' },
        { regex: /software|licença|sistema|computador|notebook|servidor/i, categoria: 'TECNOLOGIA' },
        { regex: /marketing|publicidade|anúncio|campanha|divulgação/i, categoria: 'MARKETING' },
        { regex: /consultoria|assessoria|advocacia|contabilidade|jurídico/i, categoria: 'SERVICOS_PROFISSIONAIS' },
        { regex: /manutenção|reparo|conserto|assistência|técnica/i, categoria: 'MANUTENCAO' },
        { regex: /energia|água|telefone|internet|luz|celular/i, categoria: 'UTILIDADES' }
      ];
      
      for (const padrao of padroesBasicos) {
        if (padrao.regex.test(texto)) {
          melhorCategoria = padrao.categoria;
          pontuacoes[melhorCategoria] = 1;
          palavrasEncontradas[melhorCategoria] = [`padrão: ${padrao.regex.source}`];
          break;
        }
      }
    }
    
    // Se ainda for OUTROS, tenta uma última análise
    if (melhorCategoria === 'OUTROS' || pontuacoes[melhorCategoria] === 0) {
      // Verifica se há alguma palavra que possa indicar uma categoria
      const palavrasComuns = {
        'ALIMENTACAO': ['comida', 'alimento', 'refeição', 'almoço', 'jantar', 'café', 'lanche'],
        'TRANSPORTE': ['viagem', 'deslocamento', 'km', 'quilometragem', 'estrada', 'pedágio'],
        'ESCRITORIO': ['material', 'suprimento', 'impressão', 'cópia', 'documento'],
        'TECNOLOGIA': ['sistema', 'programa', 'aplicativo', 'digital', 'online', 'internet'],
        'MARKETING': ['propaganda', 'divulgação', 'campanha', 'mídia', 'anúncio', 'promoção'],
        'SERVICOS_PROFISSIONAIS': ['serviço', 'profissional', 'especializado', 'técnico', 'assessoria'],
        'MANUTENCAO': ['manutenção', 'conservação', 'limpeza', 'higienização', 'reforma', 'reparo'],
        'UTILIDADES': ['conta', 'fatura', 'mensalidade', 'assinatura', 'serviço']
      };
      
      for (const [categoria, palavras] of Object.entries(palavrasComuns)) {
        for (const palavra of palavras) {
          if (texto.includes(palavra)) {
            melhorCategoria = categoria;
            pontuacoes[melhorCategoria] = 0.8;
            palavrasEncontradas[melhorCategoria] = [`termo comum: ${palavra}`];
            break;
          }
        }
        if (melhorCategoria !== 'OUTROS' && pontuacoes[melhorCategoria] > 0) break;
      }
    }
    
    // Calcula confiança com base na pontuação
    const confianca = pontuacoes[melhorCategoria] > 0 
      ? Math.min(0.5 + (pontuacoes[melhorCategoria] * 0.1), 0.9) 
      : 0.1;

    return {
      categoria: melhorCategoria,
      confianca: confianca,
      motivo: palavrasEncontradas[melhorCategoria]?.length > 0 
        ? `Classificação por palavras-chave: ${palavrasEncontradas[melhorCategoria].join(', ')}` 
        : 'Classificação baseada em análise contextual',
      pontuacoes: pontuacoes,
      palavras_chave: palavrasEncontradas[melhorCategoria] || []
    };
  }

  /**
   * Classifica usando IA do Gemini
   */
  async classificarComIA(dados) {
    const texto = this.extrairTextoParaAnalise(dados);
    
    // Categorias específicas para o modelo de IA
    const categoriasEspecificas = {
      'ADMINISTRATIVAS': 'Despesas administrativas, honorários, serviços bancários, gestão',
      'IMPOSTOS E TAXAS': 'Impostos, taxas, tributos, contribuições fiscais',
      'INFRAESTRUTURA E UTILIDADES': 'Energia, água, internet, telefone, construções, reformas',
      'INSUMOS AGRÍCOLAS': 'Fertilizantes, sementes, defensivos, corretivos, produtos para plantio',
      'INVESTIMENTOS': 'Aquisição de imóveis, máquinas, veículos, infraestrutura',
      'MANUTENÇÃO E OPERAÇÃO': 'Combustíveis, peças, reparos, manutenção de equipamentos',
      'RECURSOS HUMANOS': 'Salários, encargos, mão de obra, contratações',
      'SEGUROS E PROTEÇÃO': 'Seguros diversos, proteção patrimonial, planos de saúde',
      'SERVIÇOS OPERACIONAIS': 'Fretes, transportes, armazenagem, serviços terceirizados',
      'OUTRAS': 'Despesas diversas que não se enquadram nas categorias anteriores'
    };
    
    // Exemplos de classificação para melhorar o aprendizado do modelo
    const exemplos = [
      {
        descricao: "Nota fiscal de combustível diesel para trator",
        categoria: "MANUTENÇÃO E OPERAÇÃO",
        subcategoria: "Combustíveis e Lubrificantes"
      },
      {
        descricao: "Pagamento de honorários advocatícios",
        categoria: "ADMINISTRATIVAS",
        subcategoria: "Honorários Advocatícios"
      },
      {
        descricao: "Compra de sementes de soja para plantio",
        categoria: "INSUMOS AGRÍCOLAS",
        subcategoria: "Sementes"
      },
      {
        descricao: "Fatura de energia elétrica da fazenda",
        categoria: "INFRAESTRUTURA E UTILIDADES",
        subcategoria: "Energia Elétrica"
      }
    ];
    
    const prompt = `
Você é um especialista em classificação de despesas agrícolas e rurais. Sua tarefa é analisar os dados de uma nota fiscal ou despesa e classificá-la na categoria e subcategoria mais apropriada.

DADOS DA DESPESA:
${JSON.stringify(dados, null, 2)}

TEXTO EXTRAÍDO PARA ANÁLISE:
${texto}

CATEGORIAS DISPONÍVEIS:
${Object.entries(categoriasEspecificas).map(([cat, desc]) => 
  `- ${cat}: ${desc}`
).join('\n')}

EXEMPLOS DE CLASSIFICAÇÃO:
${exemplos.map(ex => 
  `Descrição: "${ex.descricao}"
   Categoria: ${ex.categoria}
   Subcategoria: ${ex.subcategoria}`
).join('\n\n')}

INSTRUÇÕES:
1. Analise cuidadosamente o fornecedor, produtos/serviços, valores e contexto
2. Identifique palavras-chave e padrões que indiquem a natureza da despesa
3. Escolha a categoria mais apropriada dentre as disponíveis
4. Sugira uma subcategoria específica que melhor descreva a despesa
5. Forneça uma justificativa detalhada para sua classificação
6. Indique o nível de confiança (0-1) na sua classificação
7. IMPORTANTE: Evite classificar como "OUTRAS" a menos que seja impossível determinar uma categoria mais específica
8. Se houver ambiguidade, escolha a categoria mais provável com base no contexto

RESPOSTA (JSON):
{
  "categoria": "CATEGORIA_ESCOLHIDA",
  "subcategoria": "Nome específico da subcategoria",
  "confianca": 0.85,
  "motivo": "Justificativa detalhada da classificação",
  "palavras_chave": ["palavra1", "palavra2", "palavra3"],
  "alternativas": [
    {"categoria": "CATEGORIA_ALTERNATIVA", "confianca": 0.4}
  ]
}
`;

    try {
      // Verifica se o serviço de IA está disponível
      if (!process.env.GEMINI_API_KEY || process.env.DISABLE_AI === 'true') {
        console.log('⚠️ Serviço de IA desativado ou chave não configurada, usando classificação avançada por padrões');
        return this.classificarPorPadroesAvancados(dados);
      }

      // Implementa retry com exponential backoff
      const maxRetries = 3;
      let tentativa = 0;
      let ultimoErro = null;
      
      while (tentativa < maxRetries) {
        try {
          console.log(`🤖 Enviando prompt para o Gemini AI (tentativa ${tentativa + 1}/${maxRetries})...`);
          
          // Calcula o tempo de espera com exponential backoff
          const tempoEspera = tentativa > 0 ? Math.min(2000 * Math.pow(2, tentativa - 1), 10000) : 0;
          if (tempoEspera > 0) {
            console.log(`⏱️ Aguardando ${tempoEspera}ms antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, tempoEspera));
          }
          
          // Implementa timeout para evitar esperas longas
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout ao aguardar resposta da IA')), 15000);
          });
          
          // Tenta obter resposta da IA com timeout
          const resultPromise = this.model.generateContent(prompt);
          const result = await Promise.race([resultPromise, timeoutPromise]);
          
          const response = await result.response;
          const text = response.text();
          console.log('✅ Resposta recebida do Gemini AI');
          
          // Extrai JSON da resposta
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const classificacao = JSON.parse(jsonMatch[0]);
              
              // Valida se a categoria existe
              if (!this.categorias[classificacao.categoria]) {
                console.log('⚠️ Categoria não reconhecida:', classificacao.categoria);
                // Tenta mapear para uma categoria válida
                const categoriasMapeadas = {
                  'ADMINISTRATIVO': 'ADMINISTRATIVAS',
                  'ADMINISTRATIVAS': 'ADMINISTRATIVAS',
                  'IMPOSTOS': 'IMPOSTOS E TAXAS',
                  'TAXAS': 'IMPOSTOS E TAXAS',
                  'INFRAESTRUTURA': 'INFRAESTRUTURA E UTILIDADES',
                  'UTILIDADES': 'INFRAESTRUTURA E UTILIDADES',
                  'INSUMOS': 'INSUMOS AGRÍCOLAS',
                  'AGRICOLA': 'INSUMOS AGRÍCOLAS',
                  'AGRÍCOLA': 'INSUMOS AGRÍCOLAS',
                  'INVESTIMENTO': 'INVESTIMENTOS',
                  'MANUTENCAO': 'MANUTENÇÃO E OPERAÇÃO',
                  'MANUTENÇÃO': 'MANUTENÇÃO E OPERAÇÃO',
                  'OPERACAO': 'MANUTENÇÃO E OPERAÇÃO',
                  'OPERAÇÃO': 'MANUTENÇÃO E OPERAÇÃO',
                  'RECURSOS': 'RECURSOS HUMANOS',
                  'RH': 'RECURSOS HUMANOS',
                  'SEGURO': 'SEGUROS E PROTEÇÃO',
                  'SEGUROS': 'SEGUROS E PROTEÇÃO',
                  'PROTEÇÃO': 'SEGUROS E PROTEÇÃO',
                  'PROTECAO': 'SEGUROS E PROTEÇÃO',
                  'SERVICOS': 'SERVIÇOS OPERACIONAIS',
                  'SERVIÇOS': 'SERVIÇOS OPERACIONAIS',
                  'OPERACIONAIS': 'SERVIÇOS OPERACIONAIS',
                  'OUTRO': 'OUTRAS',
                  'OUTROS': 'OUTRAS',
                  'DIVERSAS': 'OUTRAS'
                };
                
                // Tenta encontrar uma categoria similar
                let categoriaEncontrada = null;
                for (const [key, value] of Object.entries(categoriasMapeadas)) {
                  if (classificacao.categoria.includes(key)) {
                    categoriaEncontrada = value;
                    break;
                  }
                }
                
              if (categoriaEncontrada) {
                console.log('🔄 Mapeando categoria para:', categoriaEncontrada);
                classificacao.categoria = categoriaEncontrada;
                classificacao.confianca = Math.max(classificacao.confianca - 0.1, 0.3);
                classificacao.motivo += ' (categoria mapeada automaticamente)';
              } else {
                classificacao.categoria = 'OUTRAS';
                classificacao.confianca = 0.3;
                classificacao.motivo = 'Categoria não reconhecida, classificado como OUTRAS';
              }
              }
              // Se a categoria final for OUTROS/OUTRAS, reduzir confiança para evitar falsas certezas
              if (['OUTROS', 'OUTRAS'].includes(classificacao.categoria)) {
                const conf = typeof classificacao.confianca === 'number' ? classificacao.confianca : 0.3;
                classificacao.confianca = Math.min(conf, 0.4);
                classificacao.motivo = (classificacao.motivo || 'Classificado como OUTRAS') + ' (confiança reduzida)';
              }
              
              // Adiciona informações extras para debug
              classificacao.fonte = 'gemini';
              classificacao.texto_analisado = texto.substring(0, 100) + '...';
              classificacao.tentativas = tentativa + 1;
              
              return classificacao;
            } catch (jsonError) {
              console.error('Erro ao processar JSON da resposta:', jsonError);
              ultimoErro = jsonError;
              tentativa++;
              continue; // Tenta novamente
            }
          }
          
          // Se chegou aqui, não encontrou JSON válido
          ultimoErro = new Error('Resposta da IA não contém JSON válido');
          tentativa++;
          
        } catch (error) {
          console.error(`Erro na tentativa ${tentativa + 1}:`, error);
          ultimoErro = error;
          
          // Verifica se é um erro que justifica retry
          const errorMessage = error.message || '';
          const retryableError = 
            errorMessage.includes('503') || 
            errorMessage.includes('overloaded') || 
            errorMessage.includes('Service Unavailable') ||
            errorMessage.includes('Timeout') ||
            errorMessage.includes('rate limit');
            
          if (!retryableError) {
            console.log('⚠️ Erro não recuperável, usando classificação por padrões avançados');
            break; // Sai do loop para usar fallback
          }
          
          tentativa++;
        }
      }
      
      // Se chegou aqui, todas as tentativas falharam
      console.log(`⚠️ Todas as ${maxRetries} tentativas falharam. Último erro:`, ultimoErro);
      console.log('⚠️ Usando classificação por padrões avançados como fallback');
      
      // Registra o erro para diagnóstico
      const errorMessage = ultimoErro ? ultimoErro.message : 'Erro desconhecido';
      console.error('Erro na classificação com IA após múltiplas tentativas:', errorMessage);
      
      return this.classificarPorPadroesAvancados(dados);
      
    } catch (error) {
      console.error('Erro inesperado na classificação com IA:', error);
      console.log('⚠️ Serviço de IA indisponível, usando classificação por padrões avançados');
      
      // Verifica se é um erro de sobrecarga do serviço
      const errorMessage = error.message || '';
      if (errorMessage.includes('503') || 
          errorMessage.includes('overloaded') || 
          errorMessage.includes('Service Unavailable') ||
          errorMessage.includes('Timeout')) {
        console.log('⚠️ Serviço de IA sobrecarregado, usando classificação por padrões avançados');
      }
      
      return this.classificarPorPadroesAvancados(dados);
    }
  }
  
  /**
   * Classificação por padrões avançados (fallback quando a IA não está disponível)
   */
  classificarPorPadroesAvancados(dados) {
    console.log('🔍 Iniciando classificação por padrões avançados...');
    const texto = this.extrairTextoParaAnalise(dados).toLowerCase();
    
    // Padrões específicos para categorias comuns
    const padroesPorCategoria = [
      {
        categoria: 'ADMINISTRATIVAS',
        subcategoria: 'Serviços Administrativos',
        padroes: ['assessoria', 'consultoria', 'honorário', 'honorarios', 'advocacia', 'contabilidade', 'gestão', 'gestao', 'administração', 'administracao'],
        confianca: 0.7
      },
      {
        categoria: 'IMPOSTOS E TAXAS',
        subcategoria: 'Impostos',
        padroes: ['imposto', 'taxa', 'tributo', 'icms', 'iptu', 'ipva', 'itr', 'irpj', 'csll', 'pis', 'cofins', 'inss', 'fgts', 'guia', 'darf'],
        confianca: 0.8
      },
      {
        categoria: 'INFRAESTRUTURA E UTILIDADES',
        subcategoria: 'Serviços Básicos',
        padroes: ['energia', 'elétrica', 'eletrica', 'água', 'agua', 'saneamento', 'telefone', 'internet', 'celular', 'telecom'],
        confianca: 0.8
      },
      {
        categoria: 'INFRAESTRUTURA E UTILIDADES',
        subcategoria: 'Construção e Reformas',
        padroes: ['construção', 'construcao', 'reforma', 'obra', 'material', 'cimento', 'tijolo', 'areia', 'telha', 'madeira', 'pintura'],
        confianca: 0.7
      },
      {
        categoria: 'INSUMOS AGRÍCOLAS',
        subcategoria: 'Fertilizantes',
        padroes: ['fertilizante', 'adubo', 'npk', 'ureia', 'nitrogênio', 'nitrogenio', 'potássio', 'potassio', 'fósforo', 'fosforo', 'nutriente'],
        confianca: 0.8
      },
      {
        categoria: 'INSUMOS AGRÍCOLAS',
        subcategoria: 'Sementes',
        padroes: ['semente', 'muda', 'plantio', 'soja', 'milho', 'trigo', 'arroz', 'feijão', 'feijao', 'algodão', 'algodao'],
        confianca: 0.8
      },
      {
        categoria: 'INSUMOS AGRÍCOLAS',
        subcategoria: 'Defensivos',
        padroes: ['defensivo', 'agrotóxico', 'agrotoxico', 'herbicida', 'fungicida', 'inseticida', 'pesticida', 'praga'],
        confianca: 0.8
      },
      {
        categoria: 'INVESTIMENTOS',
        subcategoria: 'Máquinas e Equipamentos',
        padroes: ['trator', 'colheitadeira', 'plantadeira', 'pulverizador', 'implemento', 'maquinário', 'maquinario', 'equipamento'],
        confianca: 0.7
      },
      {
        categoria: 'INVESTIMENTOS',
        subcategoria: 'Veículos',
        padroes: ['veículo', 'veiculo', 'caminhão', 'caminhao', 'caminhonete', 'pickup', 'carro', 'automóvel', 'automovel', 'moto'],
        confianca: 0.7
      },
      {
        categoria: 'MANUTENÇÃO E OPERAÇÃO',
        subcategoria: 'Combustíveis',
        padroes: ['combustível', 'combustivel', 'diesel', 'gasolina', 'etanol', 'álcool', 'alcool', 'posto', 'abastecimento'],
        confianca: 0.8
      },
      {
        categoria: 'MANUTENÇÃO E OPERAÇÃO',
        subcategoria: 'Peças e Reparos',
        padroes: ['peça', 'peca', 'reparo', 'conserto', 'manutenção', 'manutencao', 'oficina', 'mecânica', 'mecanica', 'revisão', 'revisao'],
        confianca: 0.7
      },
      {
        categoria: 'RECURSOS HUMANOS',
        subcategoria: 'Salários e Encargos',
        padroes: ['salário', 'salario', 'folha', 'pagamento', 'funcionário', 'funcionario', 'colaborador', 'encargo', 'férias', 'ferias', '13º'],
        confianca: 0.8
      },
      {
        categoria: 'SEGUROS E PROTEÇÃO',
        subcategoria: 'Seguros',
        padroes: ['seguro', 'apólice', 'apolice', 'cobertura', 'sinistro', 'proteção', 'protecao', 'vida', 'saúde', 'saude', 'plano'],
        confianca: 0.8
      },
      {
        categoria: 'SERVIÇOS OPERACIONAIS',
        subcategoria: 'Fretes e Transportes',
        padroes: ['frete', 'transporte', 'logística', 'logistica', 'entrega', 'carga', 'descarga', 'armazenagem', 'armazém', 'armazem', 'silo'],
        confianca: 0.7
      }
    ];
    
    // Verifica se o texto contém algum dos padrões
    for (const padrao of padroesPorCategoria) {
      for (const termo of padrao.padroes) {
        if (texto.includes(termo)) {
          return {
            categoria: padrao.categoria,
            subcategoria: padrao.subcategoria,
            confianca: padrao.confianca,
            motivo: `Classificação por padrões avançados identificou "${termo}" associado à categoria ${padrao.categoria}`,
            fonte: 'padrao_avancado'
          };
        }
      }
    }
    
    // Análise de valores
    const valor = parseFloat(dados.valor || '0');
    if (valor > 10000) {
      // Valores altos geralmente são investimentos ou insumos
      return {
        categoria: 'INVESTIMENTOS',
        subcategoria: 'Aquisição de Alto Valor',
        confianca: 0.5,
        motivo: `Valor alto (${valor}) sugere um investimento ou aquisição significativa`,
        fonte: 'analise_valor'
      };
    } else if (valor > 5000) {
      return {
        categoria: 'INSUMOS AGRÍCOLAS',
        subcategoria: 'Insumos Diversos',
        confianca: 0.4,
        motivo: `Valor significativo (${valor}) sugere compra de insumos agrícolas`,
        fonte: 'analise_valor'
      };
    } else if (valor < 100) {
      return {
        categoria: 'ADMINISTRATIVAS',
        subcategoria: 'Despesas Pequenas',
        confianca: 0.3,
        motivo: `Valor pequeno (${valor}) sugere despesa administrativa ou de escritório`,
        fonte: 'analise_valor'
      };
    }
    
    // Se não encontrou nenhum padrão específico, retorna uma classificação genérica
    return {
      categoria: 'OUTRAS',
      subcategoria: 'Despesas Diversas',
      confianca: 0.3,
      motivo: 'Não foi possível identificar um padrão específico para esta despesa',
      fonte: 'fallback_padrao'
    };
  }

  /**
   * Classificação baseada no fornecedor (nome/marca indicam o tipo de despesa)
   * Dá prioridade alta quando há correspondência forte com ramos conhecidos.
   */
  classificarPorFornecedor(dados) {
    const textoFornecedor = (dados.fornecedor?.nome || '').toLowerCase();
    const textoCompleto = this.extrairTextoParaAnalise(dados).toLowerCase();

    // Lista de padrões por fornecedor comum -> categoria/subcategoria
    const regras = [
      // Combustíveis / postos
      {
        padroes: ['posto', 'ipiranga', 'shell', 'petrobras', 'ale', 'raizen', 'br distribuidora', 'grid'],
        categoria: 'MANUTENÇÃO E OPERAÇÃO',
        subcategoria: 'Combustíveis',
        confianca: 0.85
      },
      // Peças / oficinas
      {
        padroes: ['auto peças', 'autopecas', 'auto-peças', 'mecânica', 'mecanica', 'oficina', 'borracharia', 'truck center', 'peças'],
        categoria: 'MANUTENÇÃO E OPERAÇÃO',
        subcategoria: 'Peças e Reparos',
        confianca: 0.8
      },
      // Insumos agrícolas - cooperativas e fornecedores conhecidos
      {
        padroes: ['cooperativa', 'coamo', 'cvale', 'syngenta', 'bayer', 'yara', 'adubos', 'fertilizantes'],
        categoria: 'INSUMOS AGRÍCOLAS',
        subcategoria: 'Fertilizantes',
        confianca: 0.85
      },
      {
        padroes: ['sementes', 'soja semente', 'milho semente', 'agros'],
        categoria: 'INSUMOS AGRÍCOLAS',
        subcategoria: 'Sementes',
        confianca: 0.85
      },
      {
        padroes: ['defensivos', 'herbicida', 'fungicida', 'inseticida', 'agrotóxico', 'agrotoxico'],
        categoria: 'INSUMOS AGRÍCOLAS',
        subcategoria: 'Defensivos',
        confianca: 0.85
      },
      // Telecom
      {
        padroes: ['claro', 'vivo', 'tim', 'oi', 'telecom'],
        categoria: 'INFRAESTRUTURA E UTILIDADES',
        subcategoria: 'Telefone e Internet',
        confianca: 0.8
      },
      // Energia elétrica
      {
        padroes: ['copel', 'energisa', 'cemig', 'neoenergia', 'enel'],
        categoria: 'INFRAESTRUTURA E UTILIDADES',
        subcategoria: 'Energia Elétrica',
        confianca: 0.8
      },
      // Supermercados / alimentação
      {
        padroes: ['supermercado', 'mercado', 'carrefour', 'assai', 'atacadão', 'atacadao', 'angeloni'],
        categoria: 'ADMINISTRATIVAS',
        subcategoria: 'Alimentação',
        confianca: 0.75
      },
      // Hospedagem
      {
        padroes: ['hotel', 'pousada', 'ibis', 'motel'],
        categoria: 'ADMINISTRATIVAS',
        subcategoria: 'Hospedagem',
        confianca: 0.8
      },
      // Jurídico / Contábil
      {
        padroes: ['advocacia', 'advogados', 'escritorio jurídico', 'juridico'],
        categoria: 'ADMINISTRATIVAS',
        subcategoria: 'Honorários Advocatícios',
        confianca: 0.8
      },
      {
        padroes: ['contabilidade', 'contador', 'escritorio contábil', 'contábil'],
        categoria: 'ADMINISTRATIVAS',
        subcategoria: 'Contabilidade',
        confianca: 0.8
      },
      // Seguros
      {
        padroes: ['porto seguro', 'bradesco seguros', 'mapfre', 'allianz'],
        categoria: 'SEGUROS E PROTEÇÃO',
        subcategoria: 'Seguros',
        confianca: 0.85
      },
      // Transportes / Logística
      {
        padroes: ['transportes', 'logística', 'logistica', 'jsl', 'randon'],
        categoria: 'SERVIÇOS OPERACIONAIS',
        subcategoria: 'Fretes e Transportes',
        confianca: 0.8
      },
      // Construção / materiais
      {
        padroes: ['construtora', 'madeireira', 'material de construção', 'ferragens', 'depósito', 'deposito'],
        categoria: 'INFRAESTRUTURA E UTILIDADES',
        subcategoria: 'Construção e Reformas',
        confianca: 0.8
      },
      // Bancos / serviços bancários
      {
        padroes: ['bradesco', 'itau', 'santander', 'banco do brasil', 'sicredi', 'sicoob'],
        categoria: 'ADMINISTRATIVAS',
        subcategoria: 'Serviços Bancários',
        confianca: 0.75
      }
    ];

    // Tenta casar primeiro pelo nome do fornecedor, depois pelo texto completo
    for (const regra of regras) {
      for (const termo of regra.padroes) {
        if (textoFornecedor.includes(termo) || textoCompleto.includes(termo)) {
          return {
            categoria: regra.categoria,
            subcategoria: regra.subcategoria,
            confianca: regra.confianca,
            motivo: `Fornecedor indica ramo: "${termo}" → ${regra.categoria}`,
            fonte: 'fornecedor'
          };
        }
      }
    }

    // Fallback
    return {
      categoria: 'OUTRAS',
      subcategoria: 'Despesas Diversas',
      confianca: 0.3,
      motivo: 'Fornecedor não indicou categoria específica',
      fonte: 'fornecedor_fallback'
    };
  }

  /**
   * Combina resultados de diferentes métodos de classificação
   */
  combinarResultados(resultadoKeywords, resultadoIA) {
    // Se qualquer resultado for OUTROS/OUTRAS, garantir confiança baixa
    const clampOutros = (res) => {
      if (['OUTROS', 'OUTRAS'].includes(res.categoria)) {
        res.confianca = Math.min(res.confianca || 0.3, 0.4);
        res.motivo = (res.motivo || '') + ' (confiança ajustada para categoria genérica)';
      }
      return res;
    };

    resultadoKeywords = clampOutros({ ...resultadoKeywords });
    resultadoIA = clampOutros({ ...resultadoIA });
    // Se as categorias são iguais, aumenta a confiança
    if (resultadoKeywords.categoria === resultadoIA.categoria) {
      return {
        ...resultadoKeywords,
        confianca: Math.min(resultadoKeywords.confianca + 0.2, 0.95),
        motivo: `Classificação confirmada por keywords e IA`,
        fonte: 'combinado_match'
      };
    }
    
    // Se as categorias são diferentes, retorna a com maior confiança
    if (resultadoKeywords.confianca > resultadoIA.confianca) {
      return {
        ...resultadoKeywords,
        alternativa: resultadoIA,
        motivo: `Classificação por keywords (confiança: ${resultadoKeywords.confianca.toFixed(2)})`,
        fonte: 'combinado_keywords_confianca'
      };
    } else {
      return {
        ...resultadoIA,
        alternativa: resultadoKeywords,
        motivo: `Classificação por IA (confiança: ${resultadoIA.confianca.toFixed(2)})`,
        fonte: 'combinado_ia_confianca'
      };
    }
  }

  /**
   * Extrai texto relevante para análise
   */
  extrairTextoParaAnalise(dados) {
    const textos = [];
    
    if (dados.fornecedor?.nome) textos.push(dados.fornecedor.nome);
    if (dados.fornecedor?.cnpj) textos.push(dados.fornecedor.cnpj);
    
    if (dados.itens && Array.isArray(dados.itens)) {
      dados.itens.forEach(item => {
        if (item.descricao) textos.push(item.descricao);
        if (item.codigo) textos.push(item.codigo);
      });
    }
    
    return textos.join(' ');
  }

  /**
   * Sugere categorias alternativas
   */
  async sugerirCategorias(dados, limite = 3) {
    // 1) Tenta obter alternativas direto da IA Gemini
    try {
      const ia = await this.classificarComIA(dados);
      if (ia && Array.isArray(ia.alternativas) && ia.alternativas.length > 0) {
        const mapeadas = ia.alternativas
          .map((alt) => {
            const cat = (alt.categoria || '').toUpperCase();
            const nome = this.categorias[cat]?.nome || cat || 'Categoria';
            return {
              categoria: cat,
              nome,
              probabilidade: typeof alt.confianca === 'number' ? alt.confianca : 0.5,
              motivo: 'Sugerida pela IA como alternativa'
            };
          })
          .filter(s => s.categoria);
        if (mapeadas.length > 0) {
          return mapeadas
            .sort((a, b) => b.probabilidade - a.probabilidade)
            .slice(0, limite);
        }
      }
    } catch (e) {
      console.warn('⚠️ Falha ao obter sugestões pela IA, usando heurísticas locais:', e.message);
    }

    // 2) Fallback: calcular probabilidades locais por categoria
    const resultados = [];
    for (const categoria of Object.keys(this.categorias)) {
      const resultado = await this.calcularProbabilidadeCategoria(dados, categoria);
      resultados.push({
        categoria,
        nome: this.categorias[categoria].nome,
        probabilidade: resultado.probabilidade,
        motivo: resultado.motivo
      });
    }
    return resultados
      .sort((a, b) => b.probabilidade - a.probabilidade)
      .slice(0, limite);
  }

  /**
   * Calcula probabilidade de uma categoria específica
   */
  async calcularProbabilidadeCategoria(dados, categoria) {
    const texto = this.extrairTextoParaAnalise(dados).toLowerCase();
    const keywords = this.categorias[categoria].keywords;
    
    let pontos = 0;
    const motivos = [];
    
    keywords.forEach(keyword => {
      if (texto.includes(keyword.toLowerCase())) {
        pontos += 1;
        motivos.push(`Contém "${keyword}"`);
      }
    });
    
    const probabilidade = keywords.length > 0 ? pontos / keywords.length : 0;
    
    return {
      probabilidade,
      motivo: motivos.length > 0 ? motivos.join(', ') : 'Nenhuma palavra-chave encontrada'
    };
  }

  /**
   * Obtém informações sobre uma categoria
   */
  obterInfoCategoria(categoria) {
    // Primeiro tenta nas categorias básicas
    if (this.categorias[categoria]) return this.categorias[categoria];

    // Mapear categorias avançadas para nomes amigáveis
    const avancadas = {
      'ADMINISTRATIVAS': { nome: 'Administrativas', descricao: 'Honorários, serviços bancários, gestão e despesas administrativas', keywords: [] },
      'IMPOSTOS E TAXAS': { nome: 'Impostos e Taxas', descricao: 'Tributos fiscais, guias e contribuições', keywords: [] },
      'INFRAESTRUTURA E UTILIDADES': { nome: 'Infraestrutura e Utilidades', descricao: 'Energia, água, internet, telefonia e obras', keywords: [] },
      'INSUMOS AGRÍCOLAS': { nome: 'Insumos Agrícolas', descricao: 'Fertilizantes, sementes e defensivos', keywords: [] },
      'INVESTIMENTOS': { nome: 'Investimentos', descricao: 'Aquisição de máquinas, veículos e melhorias', keywords: [] },
      'MANUTENÇÃO E OPERAÇÃO': { nome: 'Manutenção e Operação', descricao: 'Combustíveis, peças e reparos de equipamentos', keywords: [] },
      'RECURSOS HUMANOS': { nome: 'Recursos Humanos', descricao: 'Salários, encargos e mão de obra', keywords: [] },
      'SEGUROS E PROTEÇÃO': { nome: 'Seguros e Proteção', descricao: 'Seguros patrimoniais e pessoais', keywords: [] },
      'SERVIÇOS OPERACIONAIS': { nome: 'Serviços Operacionais', descricao: 'Fretes, transportes e serviços terceirizados', keywords: [] },
      'OUTRAS': { nome: 'Outras', descricao: 'Despesas diversas não categorizadas', keywords: [] }
    };

    return avancadas[categoria] || this.categorias['OUTROS'];
  }

  /**
   * Lista todas as categorias disponíveis
   */
  listarCategorias() {
    return Object.keys(this.categorias).map(key => ({
      codigo: key,
      ...this.categorias[key]
    }));
  }

  /**
   * Aprende com classificações manuais (para futuras melhorias)
   */
  async aprenderClassificacao(dados, categoriaCorreta, feedback) {
    // TODO: Implementar aprendizado de máquina
    // Por enquanto, apenas loga para análise futura
    console.log('Feedback de classificação:', {
      dados: this.extrairTextoParaAnalise(dados),
      categoriaCorreta,
      feedback,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Analisa palavras comuns no texto para melhorar a classificação
 */
ClassificacaoService.prototype.analisarPalavrasComuns = function(texto, pontuacoes, palavrasEncontradas) {
  // Mapeamento de palavras comuns para categorias
  const palavrasComuns = {
    'ALIMENTACAO': ['comida', 'alimento', 'refeição', 'refeicao', 'almoço', 'almoco', 'jantar', 'café', 'cafe', 'lanche', 'bebida', 'mercado'],
    'TRANSPORTE': ['viagem', 'deslocamento', 'km', 'quilometragem', 'estrada', 'pedágio', 'pedagio', 'frete', 'transporte', 'passagem', 'bilhete'],
    'ESCRITORIO': ['escritório', 'escritorio', 'material', 'suprimento', 'impressão', 'impressao', 'cópia', 'copia', 'documento', 'pasta', 'arquivo'],
    'TECNOLOGIA': ['sistema', 'programa', 'aplicativo', 'app', 'digital', 'online', 'internet', 'tecnologia', 'informática', 'informatica', 'computação', 'computacao'],
    'MARKETING': ['propaganda', 'divulgação', 'divulgacao', 'campanha', 'mídia', 'midia', 'social', 'anúncio', 'anuncio', 'promoção', 'promocao'],
    'SERVICOS_PROFISSIONAIS': ['serviço', 'servico', 'profissional', 'especializado', 'técnico', 'tecnico', 'assessoria', 'consultoria', 'análise', 'analise'],
    'MANUTENCAO': ['manutenção', 'manutencao', 'conservação', 'conservacao', 'limpeza', 'higienização', 'higienizacao', 'reforma', 'reparo', 'conserto'],
    'UTILIDADES': ['conta', 'fatura', 'mensalidade', 'assinatura', 'serviço', 'servico', 'básico', 'basico', 'essencial', 'utilidade']
  };

  // Verifica palavras comuns no texto
  Object.entries(palavrasComuns).forEach(([categoria, palavras]) => {
    palavras.forEach(palavra => {
      if (texto.includes(palavra)) {
        pontuacoes[categoria] = (pontuacoes[categoria] || 0) + 0.8;
        if (!palavrasEncontradas[categoria]) {
          palavrasEncontradas[categoria] = [];
        }
        palavrasEncontradas[categoria].push(`termo comum: ${palavra}`);
      }
    });
  });

  // Análise de padrões de texto específicos
  if (texto.match(/\d+\s*kwh/i) || texto.match(/consumo\s*de\s*energia/i)) {
    pontuacoes['UTILIDADES'] = (pontuacoes['UTILIDADES'] || 0) + 2;
    palavrasEncontradas['UTILIDADES'] = palavrasEncontradas['UTILIDADES'] || [];
    palavrasEncontradas['UTILIDADES'].push('padrão: consumo de energia');
  }

  if (texto.match(/\d+\s*km/i) || texto.match(/\d+\s*litros/i)) {
    pontuacoes['TRANSPORTE'] = (pontuacoes['TRANSPORTE'] || 0) + 2;
    palavrasEncontradas['TRANSPORTE'] = palavrasEncontradas['TRANSPORTE'] || [];
    palavrasEncontradas['TRANSPORTE'].push('padrão: quilometragem ou combustível');
  }
};

/**
 * Encontra uma categoria alternativa baseada em análise contextual
 */
ClassificacaoService.prototype.encontrarCategoriaAlternativa = function(texto) {
  // Análise de padrões específicos para categorias
  const padroes = [
    { regex: /\b(aliment|refei[çc][ãa]o|almo[çc]o|jantar|caf[ée]|lanche)\b/i, categoria: 'ALIMENTACAO' },
    { regex: /\b(transport|viagem|deslocamento|km|quilometr|gasolina|diesel|combust[íi]vel|uber|99|taxi|t[áa]xi)\b/i, categoria: 'TRANSPORTE' },
    { regex: /\b(escrit[óo]rio|papel|caneta|impres|c[óo]pia|documento|pasta|arquivo)\b/i, categoria: 'ESCRITORIO' },
    { regex: /\b(software|programa|sistema|digital|online|internet|computador|notebook|laptop|desktop)\b/i, categoria: 'TECNOLOGIA' },
    { regex: /\b(marketing|propaganda|divulga[çc][ãa]o|campanha|m[íi]dia|an[úu]ncio|promo[çc][ãa]o)\b/i, categoria: 'MARKETING' },
    { regex: /\b(servi[çc]o|profissional|especializado|t[ée]cnico|assessoria|consultoria)\b/i, categoria: 'SERVICOS_PROFISSIONAIS' },
    { regex: /\b(manuten[çc][ãa]o|conserva[çc][ãa]o|limpeza|higieniza[çc][ãa]o|reforma|reparo|conserto)\b/i, categoria: 'MANUTENCAO' },
    { regex: /\b(conta|fatura|mensalidade|assinatura|energia|[áa]gua|telefone|internet)\b/i, categoria: 'UTILIDADES' }
  ];

  for (const padrao of padroes) {
    if (padrao.regex.test(texto)) {
      return padrao.categoria;
    }
  }

  return null;
};

module.exports = ClassificacaoService;