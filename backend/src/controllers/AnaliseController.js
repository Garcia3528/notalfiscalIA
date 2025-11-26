const Fornecedor = require('../models/Fornecedor');
const Faturado = require('../models/Faturado');
const TipoDespesa = require('../models/TipoDespesa');
const ClassificacaoService = require('../services/ClassificacaoService');
const ContaPagar = require('../models/ContaPagar');

class AnaliseController {
  static async verificar(req, res) {
    try {
      const dados = req.body?.dados || req.body || {};

      const fornecedorInput = dados.fornecedor || {};
      const faturadoInput = dados.faturado || {};
      const despesaNome = dados.tipoDespesaNome || dados.tipo_despesa_sugerido?.nome || null;

      // Fornecedor
      let fornecedor = null;
      if (fornecedorInput.cnpj) {
        fornecedor = await Fornecedor.findByCnpj(fornecedorInput.cnpj);
      }

      // Faturado (apenas CPF)
      let faturado = null;
      if (faturadoInput.cpf) {
        faturado = await Faturado.findByCpf(faturadoInput.cpf);
      }

      // Tipo de Despesa
      let tipoDespesa = null;
      if (despesaNome) {
        tipoDespesa = await TipoDespesa.findByNome(despesaNome);
      }

      const resposta = {
        fornecedor: {
          nome: fornecedorInput.razaoSocial || null,
          cnpj: fornecedorInput.cnpj || null,
          status: fornecedor ? 'EXISTE' : 'NAO_EXISTE',
          id: fornecedor?.id || null
        },
        faturado: {
          nome: faturadoInput.nomeCompleto || null,
          documento: faturadoInput.cpf || faturadoInput.cnpj || null,
          status: faturado ? 'EXISTE' : 'NAO_EXISTE',
          id: faturado?.id || null
        },
        despesa: {
          nome: despesaNome || null,
          status: tipoDespesa ? 'EXISTE' : 'NAO_EXISTE',
          id: tipoDespesa?.id || null
        }
      };

      return res.json({ success: true, data: resposta });
    } catch (error) {
      console.error('Erro na verificação de existência:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async registrar(req, res) {
    try {
      const dados = req.body?.dados || req.body || {};
      const criarSeNaoExistir = req.body?.criarSeNaoExistir ?? true;
      const usarIA = req.body?.opcoes?.usarIA ?? true;

      // Instancia serviço de classificação IA
      const classificacaoService = new ClassificacaoService();

      // Checar/criar fornecedor
      let fornecedor = null;
      if (dados.fornecedor?.cnpj) {
        fornecedor = await Fornecedor.findByCnpj(dados.fornecedor.cnpj);
        if (!fornecedor && criarSeNaoExistir) {
          fornecedor = await Fornecedor.create({
            razao_social: dados.fornecedor.razaoSocial,
            nome_fantasia: dados.fornecedor.nomeFantasia,
            cnpj: dados.fornecedor.cnpj,
            endereco: dados.fornecedor.endereco,
            ativo: true
          });
        }
      }

      // Checar/criar faturado (apenas CPF)
      let faturado = null;
      const cpf = dados.faturado?.cpf || null;
      if (cpf) {
        faturado = await Faturado.findByCpf(cpf);
      }
      if (!faturado && criarSeNaoExistir && cpf) {
        faturado = await Faturado.create({
          nome_completo: dados.faturado?.nomeCompleto || dados.faturado?.razaoSocial || 'Faturado não identificado',
          cpf: cpf,
          endereco: dados.faturado?.endereco || null,
          ativo: true
        });
      }

      // Checar/criar classificação de despesa usando IA Gemini
      let tipoDespesa = null;
      const despesaNome = dados.tipoDespesaNome || dados.tipo_despesa_sugerido?.nome || null;

      // 1) Se veio nome explícito, tentar usar ele primeiro
      if (despesaNome) {
        tipoDespesa = await TipoDespesa.findByNome(despesaNome);
        if (!tipoDespesa && criarSeNaoExistir) {
          tipoDespesa = await TipoDespesa.create({
            nome: despesaNome,
            descricao: dados.tipo_despesa_sugerido?.descricao || 'Criado automaticamente',
            categoria: dados.tipo_despesa_sugerido?.categoria || 'OUTRAS',
            ativo: true
          });
        }
      }

      // 2) Executa classificação por IA Gemini para determinar categoria/subcategoria
      let resultadoIA = null;
      if (usarIA) {
        try {
          resultadoIA = await classificacaoService.classificarComIA({
            fornecedor: dados.fornecedor,
            faturado: dados.faturado,
            descricaoProdutos: dados.descricaoProdutos,
            valor: dados.valorTotal,
            numero: dados.numero,
            dataEmissao: dados.dataEmissao
          });
        } catch (e) {
          console.warn('⚠️ Falha na classificação por IA, usando lógica de padrões:', e.message);
          resultadoIA = await classificacaoService.classificarDespesa({
            descricaoProdutos: dados.descricaoProdutos,
            valor: dados.valorTotal
          });
        }
      }

      // 3) Com base no resultado da IA, garantir que exista um tipo_despesa
      if (!tipoDespesa && resultadoIA && resultadoIA.categoria) {
        const categoriaIA = resultadoIA.categoria;
        const nomeIA = resultadoIA.subcategoria || dados.tipo_despesa_sugerido?.nome || null;

        // Prioriza buscar por nome da subcategoria indicada pela IA
        if (nomeIA) {
          tipoDespesa = await TipoDespesa.findByNome(nomeIA);
        }

        // Se não encontrou por nome, tenta pegar qualquer tipo existente naquela categoria
        if (!tipoDespesa) {
          const daCategoria = await TipoDespesa.findByCategoria(categoriaIA);
          if (daCategoria && daCategoria.length > 0) {
            tipoDespesa = daCategoria[0];
          }
        }

        // Se ainda não existir, cria um novo tipo com base na IA
        if (!tipoDespesa && criarSeNaoExistir) {
          tipoDespesa = await TipoDespesa.create({
            nome: nomeIA || `Despesa - ${categoriaIA}`,
            descricao: resultadoIA.motivo || 'Classificado automaticamente pela IA',
            categoria: categoriaIA,
            ativo: true
          });
        }
      }

      // 4) Fallback final para classificação baseada em regras internas
      if (!tipoDespesa) {
        tipoDespesa = await TipoDespesa.classificarDespesa(dados.descricaoProdutos || '');
      }

      // Criar registro do movimento (conta a pagar)
      const parcelas = [];
      const qtdParcelas = parseInt(dados.quantidadeParcelas || 1, 10);
      const valorTotal = Number(dados.valorTotal || 0);
      const vencimento = dados.dataVencimento || dados.dataEmissao;
      const valorPorParcela = qtdParcelas > 0 ? (valorTotal / qtdParcelas) : valorTotal;

      for (let i = 1; i <= (qtdParcelas || 1); i++) {
        parcelas.push({
          numero_parcela: i,
          data_vencimento: vencimento,
          valor: Number(valorPorParcela.toFixed(2))
        });
      }

      const contaPagarData = {
        fornecedor_id: fornecedor?.id || null,
        faturado_id: faturado?.id || null,
        numero_nota_fiscal: dados.numero || null,
        data_emissao: dados.dataEmissao,
        descricao_produtos: dados.descricaoProdutos || null,
        valor_total: valorTotal,
        observacoes: null,
        arquivo_pdf_path: dados.arquivo?.filename || null,
        dados_extraidos_json: dados // salva o payload bruto para auditoria
      };

      const tiposDespesaIds = tipoDespesa ? Array.from(new Set([tipoDespesa.id])) : [];

      const movimento = await ContaPagar.create(contaPagarData, parcelas, tiposDespesaIds);

      return res.json({
        success: true,
        message: 'Registro lançado com sucesso',
        data: {
          fornecedor,
          faturado,
          tipoDespesa,
          movimento
        }
      });
    } catch (error) {
      console.error('Erro ao registrar movimento:', error);

      // Tratamento específico para banco não configurado ou schema ausente
      const msg = (error && (error.message || error.toString())) || 'Erro interno';
      const lower = msg.toLowerCase();

      // Erros típicos quando tabela/relacionamento não existe no Supabase
      const schemaMissing = (
        lower.includes('relation') && lower.includes('does not exist')
      ) || lower.includes('table') && lower.includes('does not exist')
        || lower.includes('pgrst') && lower.includes('not found');

      if (error.code === 'DATABASE_NOT_CONFIGURED' || schemaMissing) {
        return res.status(503).json({
          success: false,
          code: 'DATABASE_NOT_CONFIGURED',
          message: 'Banco de dados Supabase sem schema necessário. Execute o script supabase-full.sql.',
          hint: 'Abra o Supabase SQL Editor e rode backend/scripts/supabase-full.sql',
        });
      }

      // Demais erros — retornar 500 com detalhes mínimos
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao registrar movimento',
        error: process.env.NODE_ENV === 'development' ? msg : undefined,
      });
    }
  }
}

module.exports = AnaliseController;
