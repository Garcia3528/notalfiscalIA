const BaseModel = require('./BaseModel');
const { supabase, isSupabaseConfigured, isSupabaseConnected, testSupabaseConnection } = require('../config/supabase');
const { query } = require('../config/database');

class TipoDespesa extends BaseModel {
  constructor() {
    super('tipos_despesa');
  }
  static async findAll(ativo = true) {
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
      const { data, error } = await supabase
        .from('tipos_despesa')
        .select('*')
        .eq('ativo', ativo)
        .order('categoria')
        .order('nome');
      
      if (error) throw error;
      return data;
      } catch (error) {
        console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
        // Fallback para PostgreSQL se Supabase falhar
      }
    }
      const result = await query(
        'SELECT * FROM tipos_despesa WHERE ativo = $1 ORDER BY categoria, nome',
        [ativo]
      );
      return result.rows;
    }

  static async findByNome(nome) {
    if (!nome) return null;
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
        // Testar conectividade se necessário
        if (!isSupabaseConnected) {
          const connected = await testSupabaseConnection();
          if (!connected) {
            console.warn('⚠️  Supabase não conectado, usando fallback local para findByNome');
            const result = await query(
              'SELECT * FROM tipos_despesa WHERE ativo = true AND LOWER(nome) = LOWER($1) LIMIT 1',
              [nome]
            );
            return result.rows[0] || null;
          }
        }

        const { data, error } = await supabase
          .from('tipos_despesa')
          .select('*')
          .ilike('nome', nome)
          .eq('ativo', true)
          .limit(1);
        
        if (error && error.code !== 'PGRST116') {
          // Se for erro de conectividade, usar fallback
          if (error.message.includes('fetch failed') || error.message.includes('network')) {
            console.warn('⚠️  Erro de rede no Supabase, usando fallback local para findByNome');
            const result = await query(
              'SELECT * FROM tipos_despesa WHERE ativo = true AND LOWER(nome) = LOWER($1) LIMIT 1',
              [nome]
            );
            return result.rows[0] || null;
          }
          throw error;
        }
        return data[0] || null;
      } catch (err) {
        // Fallback para banco local em caso de erro
        if (err.message.includes('fetch failed') || err.message.includes('network')) {
          console.warn('⚠️  Erro de conectividade no Supabase, usando fallback local para findByNome');
          const result = await query(
            'SELECT * FROM tipos_despesa WHERE ativo = true AND LOWER(nome) = LOWER($1) LIMIT 1',
            [nome]
          );
          return result.rows[0] || null;
        }
        throw err;
      }
    } else {
      const result = await query(
        'SELECT * FROM tipos_despesa WHERE ativo = true AND LOWER(nome) = LOWER($1) LIMIT 1',
        [nome]
      );
      return result.rows[0] || null;
    }
  }

  static async findById(id) {
    const instance = new TipoDespesa();
    return instance.findById(id);
  }

  static async findByCategoria(categoria) {
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
      const { data, error } = await supabase
        .from('tipos_despesa')
        .select('*')
        .eq('categoria', categoria)
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      return data;
      } catch (error) {
        console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
        // Fallback para PostgreSQL se Supabase falhar
      }
    }
      const result = await query(
        'SELECT * FROM tipos_despesa WHERE categoria = $1 AND ativo = true ORDER BY nome',
        [categoria]
      );
      return result.rows;
    }

  static async create(tipoDespesaData) {
    const instance = new TipoDespesa();
    return instance.create(tipoDespesaData);
  }

  static async update(id, tipoDespesaData) {
    const instance = new TipoDespesa();
    return instance.update(id, tipoDespesaData);
  }

  static async inactivate(id) {
    const instance = new TipoDespesa();
    return instance.inactivate(id);
  }

  static async reactivate(id) {
    const instance = new TipoDespesa();
    return instance.reactivate(id);
  }

  static async search(searchTerm) {
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
      const { data, error } = await supabase
        .from('tipos_despesa')
        .select('*')
        .eq('ativo', true)
        .or(`nome.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%,categoria.ilike.%${searchTerm}%`)
        .order('categoria')
        .order('nome');
      
      if (error) throw error;
      return data;
      } catch (error) {
        console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
        // Fallback para PostgreSQL se Supabase falhar
      }
    }
      const result = await query(
        `SELECT * FROM tipos_despesa 
         WHERE ativo = true AND (
           nome ILIKE $1 OR 
           descricao ILIKE $1 OR 
           categoria ILIKE $1
         )
         ORDER BY categoria, nome`,
        [`%${searchTerm}%`]
      );
      return result.rows;
    }

  static async getCategorias() {
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
      const { data, error } = await supabase
        .from('tipos_despesa')
        .select('categoria')
        .eq('ativo', true)
        .order('categoria');
      
      if (error) throw error;
      
      // Remove duplicatas
      const categorias = [...new Set(data.map(row => row.categoria))];
      return categorias;
      } catch (error) {
        console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
        // Fallback para PostgreSQL se Supabase falhar
      }
    }
      const result = await query(
        'SELECT DISTINCT categoria FROM tipos_despesa WHERE ativo = true ORDER BY categoria'
      );
      return result.rows.map(row => row.categoria);
    }

  // Método para classificar automaticamente uma despesa baseada na descrição dos produtos
  static async classificarDespesa(descricaoProdutos) {
    const descricaoLower = (descricaoProdutos || '').toLowerCase();
    console.log('🔍 Classificando descrição:', descricaoLower);

    // Mapeamento de palavras-chave para categorias alinhadas ao banco de dados
    const mapaCategorias = {
      'ADMINISTRATIVAS': [
        'honorario', 'honorário', 'advocaticio', 'advocatício', 'agronomico', 'agronômico', 
        'contabil', 'contábil', 'despesa bancaria', 'despesa bancária', 'banco', 'tarifa', 'taxa bancaria',
        'escritorio', 'escritório', 'administracao', 'administração', 'gestao', 'gestão', 'secretaria'
      ],
      'IMPOSTOS E TAXAS': [
        'incra', 'ccir', 'iptu', 'ipva', 'itr', 'imposto', 'taxa', 'tributo', 'contribuicao', 'contribuição',
        'fiscal', 'darf', 'gnre', 'icms', 'pis', 'cofins', 'csll', 'irpj', 'inss', 'fgts', 'alvara', 'alvará'
      ],
      'INFRAESTRUTURA E UTILIDADES': [
        'energia', 'luz', 'eletrica', 'elétrica', 'conta de luz', 'eletricidade',
        'agua', 'água', 'esgoto', 'arrendamento', 'construcao', 'construção', 'reforma',
        'material de construcao', 'material de construção', 'cimento', 'tijolo', 'telha',
        'internet', 'telefone', 'celular', 'comunicacao', 'comunicação', 'rede', 'wifi', 'fibra'
      ],
      'INSUMOS AGRÍCOLAS': [
        'fertilizante', 'adubo', 'semente', 'sementes', 'npk', 'ureia', 'calcario', 'calcário', 
        'defensivo', 'agrotóxico', 'herbicida', 'inseticida', 'fungicida', 'corretivo', 'insumo',
        'plantio', 'cultivo', 'lavoura', 'safra', 'colheita', 'agricultura', 'agrícola', 'agropecuaria',
        'agropecuária', 'fazenda', 'rural', 'campo', 'plantação', 'plantacao'
      ],
      'INVESTIMENTOS': [
        'aquisicao', 'aquisição', 'compra', 'imovel', 'imóvel', 'maquina', 'máquina', 'trator',
        'veiculo', 'veículo', 'carro', 'caminhao', 'caminhão', 'infraestrutura rural',
        'investimento', 'aplicacao', 'aplicação', 'ativo', 'patrimonio', 'patrimônio', 'bem'
      ],
      'MANUTENÇÃO E OPERAÇÃO': [
        'combustivel', 'combustível', 'gasolina', 'diesel', 'etanol', 'manutencao', 'manutenção', 
        'conserto', 'reparo', 'ferramenta', 'peca', 'peça', 'componente', 'pneu', 'filtro', 'oleo', 'óleo',
        'oficina', 'mecanica', 'mecânica', 'revisao', 'revisão', 'troca', 'substituicao', 'substituição'
      ],
      'RECURSOS HUMANOS': [
        'salario', 'salário', 'encargo', 'folha', 'pagamento', 'mao de obra', 'mão de obra',
        'temporario', 'temporário', 'trabalhador', 'funcionario', 'funcionário',
        'pessoal', 'rh', 'recursos humanos', 'colaborador', 'empregado', 'contratacao', 'contratação',
        'ferias', 'férias', '13º', 'decimo terceiro', 'décimo terceiro', 'rescisao', 'rescisão'
      ],
      'SEGUROS E PROTEÇÃO': [
        'seguro', 'protecao', 'proteção', 'agricola', 'agrícola', 'ativo', 'prestamista',
        'apolice', 'apólice', 'cobertura', 'sinistro', 'premio', 'prêmio', 'seguradora',
        'vida', 'saude', 'saúde', 'plano de saude', 'plano de saúde', 'assistencia', 'assistência'
      ],
      'SERVIÇOS OPERACIONAIS': [
        'frete', 'transporte', 'colheita', 'pulverizacao', 'pulverização', 'secagem', 'armazenagem',
        'terceirizado', 'servico', 'serviço', 'logistica', 'logística', 'entrega', 'distribuicao', 'distribuição',
        'armazem', 'armazém', 'silo', 'estocagem', 'estoque', 'beneficiamento', 'processamento'
      ],
      'OUTRAS': [
        'papelaria', 'caneta', 'papel', 'toner', 'impressora', 'material de escritorio', 'material de escritório',
        'software', 'licenca', 'licença', 'assinatura', 'marketing', 'publicidade', 'outros', 'diverso',
        'viagem', 'hospedagem', 'hotel', 'passagem', 'alimentacao', 'alimentação', 'refeicao', 'refeição',
        'treinamento', 'curso', 'capacitacao', 'capacitação', 'evento', 'congresso', 'seminario', 'seminário'
      ]
    };

    // Mapeamento de palavras-chave mais específicas para nomes do tipo_despesa
    const mapaNomes = [
      // ADMINISTRATIVAS
      { keywords: ['despesa bancaria', 'despesa bancária', 'banco', 'tarifa bancaria', 'taxa bancaria', 'ted', 'doc', 'transferencia', 'transferência'], nome: 'Despesas Bancárias' },
      { keywords: ['honorario advocaticio', 'honorário advocatício', 'advogado', 'juridico', 'jurídico', 'advocacia', 'escritorio de advocacia', 'escritório de advocacia'], nome: 'Honorários Advocatícios' },
      { keywords: ['honorario agronomico', 'honorário agronômico', 'agronomo', 'agrônomo', 'engenheiro agronomo', 'engenheiro agrônomo', 'consultoria agronomica', 'consultoria agronômica'], nome: 'Honorários Agronômicos' },
      { keywords: ['honorario contabil', 'honorário contábil', 'contador', 'contabilidade', 'escritorio contabil', 'escritório contábil', 'servico contabil', 'serviço contábil'], nome: 'Honorários Contábeis' },
      
      // IMPOSTOS E TAXAS
      { keywords: ['incra', 'ccir', 'cadastro rural'], nome: 'INCRA-CCIR' },
      { keywords: ['iptu', 'imposto predial', 'imposto territorial urbano'], nome: 'IPTU' },
      { keywords: ['ipva', 'imposto sobre veiculo', 'imposto sobre veículo', 'licenciamento'], nome: 'IPVA' },
      { keywords: ['itr', 'imposto territorial rural'], nome: 'ITR' },
      
      // INFRAESTRUTURA E UTILIDADES
      { keywords: ['arrendamento', 'arrendamento de terra', 'aluguel de terra', 'aluguel de área', 'aluguel de area'], nome: 'Arrendamento de Terras' },
      { keywords: ['construcao', 'construção', 'reforma', 'obra', 'edificacao', 'edificação', 'predio', 'prédio', 'galpao', 'galpão'], nome: 'Construções e Reformas' },
      { keywords: ['energia', 'luz', 'eletrica', 'elétrica', 'eletricidade', 'conta de luz', 'fatura de energia', 'copel', 'cemig', 'cpfl', 'enel'], nome: 'Energia Elétrica' },
      { keywords: ['material de construcao', 'material de construção', 'cimento', 'tijolo', 'telha', 'madeira', 'prego', 'parafuso', 'ferragem'], nome: 'Materiais de Construção' },
      { keywords: ['internet', 'banda larga', 'fibra', 'wifi', 'conexao', 'conexão', 'rede', 'provedor'], nome: 'Internet' },
      { keywords: ['telefone', 'celular', 'linha telefonica', 'linha telefônica', 'movel', 'móvel', 'operadora'], nome: 'Telefonia' },
      
      // INSUMOS AGRÍCOLAS
      { keywords: ['calcario', 'calcário', 'corretivo', 'correcao de solo', 'correção de solo'], nome: 'Corretivos' },
      { keywords: ['defensivo', 'agrotóxico', 'herbicida', 'inseticida', 'fungicida', 'pesticida', 'praga', 'doenca', 'doença'], nome: 'Defensivos Agrícolas' },
      { keywords: ['fertilizante', 'adubo', 'npk', 'ureia', 'nitrogenio', 'nitrogênio', 'fosforo', 'fósforo', 'potassio', 'potássio'], nome: 'Fertilizantes' },
      { keywords: ['semente', 'sementes', 'muda', 'mudas', 'plantio', 'variedade', 'cultivar'], nome: 'Sementes' },
      
      // INVESTIMENTOS
      { keywords: ['aquisicao de imovel', 'aquisição de imóvel', 'compra de imovel', 'compra de imóvel', 'terreno', 'lote', 'fazenda', 'sitio', 'sítio'], nome: 'Aquisição de Imóveis' },
      { keywords: ['aquisicao de maquina', 'aquisição de máquina', 'compra de maquina', 'compra de máquina', 'trator', 'colheitadeira', 'plantadeira', 'pulverizador', 'implemento'], nome: 'Aquisição de Máquinas' },
      { keywords: ['aquisicao de veiculo', 'aquisição de veículo', 'compra de veiculo', 'compra de veículo', 'carro', 'caminhao', 'caminhão', 'pickup', 'picape', 'utilitario', 'utilitário'], nome: 'Aquisição de Veículos' },
      { keywords: ['infraestrutura rural', 'cerca', 'curral', 'bebedouro', 'cocheira', 'estabulo', 'estábulo', 'barracão', 'barracao'], nome: 'Infraestrutura Rural' },
      
      // MANUTENÇÃO E OPERAÇÃO
      { keywords: ['combustivel', 'combustível', 'gasolina', 'diesel', 'etanol', 'alcool', 'álcool', 'posto', 'abastecimento'], nome: 'Combustíveis e Lubrificantes' },
      { keywords: ['ferramenta', 'equipamento', 'maquina manual', 'máquina manual', 'furadeira', 'serra', 'alicate', 'chave'], nome: 'Ferramentas' },
      { keywords: ['manutencao', 'manutenção', 'conserto', 'reparo', 'revisao', 'revisão', 'oficina', 'mecanica', 'mecânica'], nome: 'Manutenção de Máquinas' },
      { keywords: ['peca', 'peça', 'componente', 'parte', 'acessorio', 'acessório', 'reposicao', 'reposição'], nome: 'Peças e Componentes' },
      { keywords: ['pneu', 'filtro', 'borracharia', 'roda', 'aro', 'camara', 'câmara', 'recapagem'], nome: 'Pneus e Filtros' },
      
      // RECURSOS HUMANOS
      { keywords: ['mao de obra temporaria', 'mão de obra temporária', 'temporario', 'temporário', 'diarista', 'safrista', 'sazonal'], nome: 'Mão de Obra Temporária' },
      { keywords: ['salario', 'salário', 'encargo', 'folha de pagamento', 'holerite', 'contracheque', 'remuneracao', 'remuneração'], nome: 'Salários e Encargos' },
      
      // SEGUROS E PROTEÇÃO
      { keywords: ['seguro agricola', 'seguro agrícola', 'seguro rural', 'seguro safra', 'proagro'], nome: 'Seguro Agrícola' },
      { keywords: ['seguro de ativo', 'seguro patrimonial', 'seguro de bem', 'seguro de maquina', 'seguro de máquina'], nome: 'Seguro de Ativos' },
      { keywords: ['seguro prestamista', 'seguro de financiamento', 'seguro de credito', 'seguro de crédito'], nome: 'Seguro Prestamista' },
      
      // SERVIÇOS OPERACIONAIS
      { keywords: ['colheita terceirizada', 'colheita', 'colhedora', 'colheitadeira', 'servico de colheita', 'serviço de colheita'], nome: 'Colheita Terceirizada' },
      { keywords: ['frete', 'transporte', 'carreto', 'carga', 'logistica', 'logística', 'entrega', 'transportadora'], nome: 'Frete e Transporte' },
      { keywords: ['pulverizacao', 'pulverização', 'aplicacao', 'aplicação', 'servico de pulverizacao', 'serviço de pulverização'], nome: 'Pulverização' },
      { keywords: ['secagem', 'armazenagem', 'silo', 'armazem', 'armazém', 'estocagem', 'estoque', 'deposito', 'depósito'], nome: 'Secagem e Armazenagem' },
      
      // OUTRAS
      { keywords: ['papelaria', 'material de escritorio', 'material de escritório', 'caneta', 'papel', 'toner', 'impressora', 'cartucho'], nome: 'Material de Escritório' },
      { keywords: ['software', 'programa', 'sistema', 'aplicativo', 'app', 'licenca', 'licença', 'assinatura digital'], nome: 'Software e Licenças' },
      { keywords: ['marketing', 'publicidade', 'propaganda', 'divulgacao', 'divulgação', 'anuncio', 'anúncio', 'campanha'], nome: 'Marketing e Publicidade' },
      { keywords: ['viagem', 'hospedagem', 'hotel', 'pousada', 'diaria', 'diária', 'passagem', 'bilhete'], nome: 'Viagens e Hospedagem' },
      { keywords: ['alimentacao', 'alimentação', 'refeicao', 'refeição', 'restaurante', 'lanchonete', 'cafe', 'café'], nome: 'Alimentação' },
      { keywords: ['treinamento', 'curso', 'capacitacao', 'capacitação', 'workshop', 'palestra', 'congresso', 'evento'], nome: 'Treinamentos e Eventos' }
    ];

    // 1) Tentar casar por nome específico primeiro (pontuação mais alta)
    let melhorNome = null;
    let melhorPontosNome = 0;
    
    for (const m of mapaNomes) {
       let pontos = 0;
       for (const keyword of m.keywords) {
         if (descricaoLower.includes(keyword)) {
           // Pontuação baseada no tamanho da palavra-chave (palavras maiores = mais específicas)
           const pontosKeyword = keyword.length > 10 ? 3 : keyword.length > 5 ? 2 : 1;
           pontos += pontosKeyword;
           console.log(`  ✅ Palavra-chave "${keyword}" encontrada para "${m.nome}" (+${pontosKeyword} pontos)`);
         }
       }
       if (pontos > melhorPontosNome) {
         melhorPontosNome = pontos;
         melhorNome = m.nome;
       }
     }

    // Se encontrou uma correspondência específica com boa pontuação, usar ela
    if (melhorNome && melhorPontosNome >= 2) {
      console.log('✅ Classificação específica encontrada:', melhorNome, 'com pontuação:', melhorPontosNome);
      // Buscar pelo nome
      if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
        try {
        const { data, error } = await supabase
          .from('tipos_despesa')
          .select('*')
          .ilike('nome', melhorNome)
          .eq('ativo', true)
          .limit(1);
        if (error) throw error;
        if (data && data.length > 0) return data[0];
        } catch (error) {
          console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
          // Fallback para PostgreSQL se Supabase falhar
        }
      }
        const result = await query(
          'SELECT * FROM tipos_despesa WHERE ativo = true AND LOWER(nome) = LOWER($1) LIMIT 1',
          [melhorNome]
        );
        if (result.rows.length > 0) return result.rows[0];
      }

    // 2) Calcular pontuação por categoria com pesos
    let melhorCategoria = null;
    let melhorPontos = 0;
    let categoriasEncontradas = {};
    
    for (const [categoria, palavras] of Object.entries(mapaCategorias)) {
      let pontos = 0;
      let palavrasEncontradas = [];
      
      for (const p of palavras) {
        if (descricaoLower.includes(p)) {
          // Pontuação baseada no tamanho da palavra-chave e posição na descrição
          const peso = p.length > 8 ? 3 : p.length > 4 ? 2 : 1;
          const posicao = descricaoLower.indexOf(p);
          const bonusPosicao = posicao < 20 ? 1 : 0; // Bonus se a palavra aparecer no início
          const pontosPalavra = peso + bonusPosicao;
          pontos += pontosPalavra;
          palavrasEncontradas.push({palavra: p, pontos: pontosPalavra});
        }
      }
      
      if (pontos > 0) {
        categoriasEncontradas[categoria] = {
          pontos: pontos,
          palavras: palavrasEncontradas
        };
      }
      
      if (pontos > melhorPontos) {
        melhorPontos = pontos;
        melhorCategoria = categoria;
      }
    }
    
    console.log('📊 Pontuação por categoria:', JSON.stringify(categoriasEncontradas, null, 2));

    // Se a pontuação for muito baixa, tentar análise contextual
    if (melhorPontos < 3 && descricaoLower.length > 10) {
      // Análise de contexto para casos específicos
      if (descricaoLower.match(/\b(loja|comercio|comércio|mercado|supermercado)\b/) && 
          descricaoLower.match(/\b(agro|rural|campo|fazenda|agricultura)\b/)) {
        console.log('🔍 Análise contextual: Detectado comércio agrícola');
        melhorCategoria = 'INSUMOS AGRÍCOLAS';
        melhorPontos += 2;
      }
      else if (descricaoLower.match(/\b(posto|abastecimento)\b/) && 
               descricaoLower.match(/\b(veiculo|veículo|carro|caminhao|caminhão|trator)\b/)) {
        console.log('🔍 Análise contextual: Detectado abastecimento de veículos');
        melhorCategoria = 'MANUTENÇÃO E OPERAÇÃO';
        melhorPontos += 2;
      }
      else if (descricaoLower.match(/\b(nota fiscal|nf|nfe|nf-e|cupom fiscal|recibo)\b/)) {
        // Tentar extrair informações adicionais do documento fiscal
        const tiposDocumento = {
          'combustivel': ['posto', 'gasolina', 'diesel', 'etanol', 'alcool'],
          'material': ['material', 'ferramenta', 'equipamento', 'peca', 'peça'],
          'servico': ['servico', 'serviço', 'mao de obra', 'mão de obra', 'prestacao', 'prestação']
        };
        
        for (const [tipo, palavras] of Object.entries(tiposDocumento)) {
          for (const palavra of palavras) {
            if (descricaoLower.includes(palavra)) {
              console.log(`🔍 Análise contextual: Detectado documento fiscal de ${tipo}`);
              if (tipo === 'combustivel') melhorCategoria = 'MANUTENÇÃO E OPERAÇÃO';
              else if (tipo === 'material') melhorCategoria = 'MANUTENÇÃO E OPERAÇÃO';
              else if (tipo === 'servico') melhorCategoria = 'SERVIÇOS OPERACIONAIS';
              melhorPontos += 2;
              break;
            }
          }
        }
      }
    }

    if (melhorCategoria && melhorPontos > 0) {
      console.log('✅ Melhor categoria encontrada:', melhorCategoria, 'com pontuação:', melhorPontos);
      // Buscar um tipo_despesa dessa categoria
      if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
        try {
        const { data, error } = await supabase
          .from('tipos_despesa')
          .select('*')
          .eq('categoria', melhorCategoria)
          .eq('ativo', true)
          .order('nome')
          .limit(1);
        if (error) throw error;
        if (data && data.length > 0) return data[0];
        } catch (error) {
          console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
          // Fallback para PostgreSQL se Supabase falhar
        }
      }
        const result = await query(
          'SELECT * FROM tipos_despesa WHERE categoria = $1 AND ativo = true ORDER BY nome LIMIT 1',
          [melhorCategoria]
        );
        if (result.rows.length > 0) return result.rows[0];
      }

    // 3) Se não encontrar uma classificação específica, tentar uma última análise de padrões comuns
    if (descricaoLower.length > 5) {
      // Padrões comuns em notas fiscais
      const padroesDespesas = [
        { regex: /\b(nf|nota fiscal|cupom)\b.*\b(combusti?vel|gasolina|diesel|etanol)\b/i, categoria: 'MANUTENÇÃO E OPERAÇÃO', nome: 'Combustíveis e Lubrificantes' },
        { regex: /\b(nf|nota fiscal|cupom)\b.*\b(peca|peça|componente|acessorio|acessório)\b/i, categoria: 'MANUTENÇÃO E OPERAÇÃO', nome: 'Peças e Componentes' },
        { regex: /\b(nf|nota fiscal|cupom)\b.*\b(servico|serviço|mao de obra|mão de obra)\b/i, categoria: 'SERVIÇOS OPERACIONAIS', nome: 'Serviços Gerais' },
        { regex: /\b(nf|nota fiscal|cupom)\b.*\b(material|suprimento|insumo)\b/i, categoria: 'INSUMOS AGRÍCOLAS', nome: 'Insumos Diversos' },
        { regex: /\b(fatura|conta|cobranca|cobrança)\b.*\b(energia|luz|eletricidade|eletrica|elétrica)\b/i, categoria: 'INFRAESTRUTURA E UTILIDADES', nome: 'Energia Elétrica' },
        { regex: /\b(fatura|conta|cobranca|cobrança)\b.*\b(agua|água|saneamento|esgoto)\b/i, categoria: 'INFRAESTRUTURA E UTILIDADES', nome: 'Água e Esgoto' },
        { regex: /\b(fatura|conta|cobranca|cobrança)\b.*\b(telefone|celular|movel|móvel|internet|telecom)\b/i, categoria: 'INFRAESTRUTURA E UTILIDADES', nome: 'Telecomunicações' }
      ];
      
      for (const padrao of padroesDespesas) {
        if (padrao.regex.test(descricaoLower)) {
          console.log(`🔍 Padrão de despesa encontrado: ${padrao.nome}`);
          
          // Buscar pelo nome específico
          if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
            try {
            const { data, error } = await supabase
              .from('tipos_despesa')
              .select('*')
              .ilike('nome', padrao.nome)
              .eq('ativo', true)
              .limit(1);
            if (error) throw error;
            if (data && data.length > 0) return data[0];
            } catch (error) {
              console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
            }
          }
          
          const result = await query(
            'SELECT * FROM tipos_despesa WHERE ativo = true AND LOWER(nome) = LOWER($1) LIMIT 1',
            [padrao.nome]
          );
          if (result.rows.length > 0) return result.rows[0];
          
          // Se não encontrou pelo nome, busca pela categoria
          if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
            try {
            const { data, error } = await supabase
              .from('tipos_despesa')
              .select('*')
              .eq('categoria', padrao.categoria)
              .eq('ativo', true)
              .order('nome')
              .limit(1);
            if (error) throw error;
            if (data && data.length > 0) return data[0];
            } catch (error) {
              console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
            }
          }
          
          const resultCat = await query(
            'SELECT * FROM tipos_despesa WHERE categoria = $1 AND ativo = true ORDER BY nome LIMIT 1',
            [padrao.categoria]
          );
          if (resultCat.rows.length > 0) return resultCat.rows[0];
        }
      }
    }

    // 4) Se não encontrar uma classificação específica, retorna a categoria genérica "Outras Despesas"
    console.log('⚠️ Nenhuma classificação específica encontrada, usando "Outras Despesas"');
    if (isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection()) {
      try {
      const { data, error } = await supabase
        .from('tipos_despesa')
        .select('*')
        .eq('nome', 'Outras Despesas')
        .eq('ativo', true);
      
      if (error) throw error;
      
      if (data.length === 0) {
        // Criar categoria genérica se não existir
        return await this.create({
          nome: 'Outras Despesas',
          descricao: 'Despesas não classificadas automaticamente',
          categoria: 'OUTRAS'
        });
      }
      
      return data[0];
      } catch (error) {
        console.log('Erro no Supabase, usando fallback PostgreSQL:', error.message);
        // Fallback para PostgreSQL se Supabase falhar
      }
    }
      const result = await query(
        'SELECT * FROM tipos_despesa WHERE nome = $1 AND ativo = true',
        ['Outras Despesas']
      );
      
      if (result.rows.length === 0) {
        // Criar categoria genérica se não existir
        return await this.create({
          nome: 'Outras Despesas',
          descricao: 'Despesas não classificadas automaticamente',
          categoria: 'OUTRAS'
        });
      }
      
      return result.rows[0];
    }
  }

module.exports = TipoDespesa;