const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const TipoDespesa = require('../models/TipoDespesa');
const ClassificacaoService = require('./ClassificacaoService');

class NotaFiscalAgentService {
  constructor(apiKeyOverride = null, modelOverride = null) {
    const disableAI = process.env.DISABLE_AI === 'true';
    this.apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
    this.modelName = modelOverride || process.env.GEMINI_MODEL || 'gemini-flash-latest';
    if (this.apiKey && !disableAI) {
      try {
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: this.modelName });
      } catch (e) {
        console.warn('Falha ao inicializar cliente Gemini na NotaFiscalAgentService:', e.message);
        this.model = null;
      }
    } else {
      if (disableAI) {
        console.warn('IA desativada por configuração (DISABLE_AI=true). Usando extração básica.');
      } else {
        console.warn('GEMINI_API_KEY não configurada. Usando extração básica de dados.');
      }
      this.model = null;
    }
  }

  async extractTextFromPdf(pdfBuffer) {
    try {
      const data = await pdfParse(pdfBuffer);
      return data.text;
    } catch (error) {
      throw new Error(`Erro ao extrair texto do PDF: ${error.message}`);
    }
  }

  async processNotaFiscal(pdfBuffer, filename) {
    try {
      // Extrair texto do PDF
      const pdfText = await this.extractTextFromPdf(pdfBuffer);
      
      let extractedData;
      
      if (this.model) {
        // Processar com IA
        extractedData = await this.extractDataWithGemini(pdfText);
      } else {
        // Usar extração básica
        extractedData = await this.extractDataBasic(pdfText);
      }
      
      // Classificar despesa automaticamente (se disponível)
      let tipoDespesa = null;
      try {
        tipoDespesa = await TipoDespesa.classificarDespesa(extractedData.descricao_produtos || extractedData.descricaoProdutos);
      } catch (error) {
        console.warn('Erro na classificação de despesa:', error.message);
      }

      // Executa classificação prioritária com IA Gemini (serviço dedicado) e inclui no payload
      let classificacao = null;
      try {
        const classificacaoService = new ClassificacaoService(this.apiKey, this.modelName);
        try {
          classificacao = await classificacaoService.classificarComIA({
            fornecedor: extractedData.fornecedor,
            faturado: extractedData.faturado,
            descricaoProdutos: extractedData.descricaoProdutos,
            valorTotal: extractedData.valorTotal,
            dataEmissao: extractedData.dataEmissao
          });
        } catch (iaErr) {
          console.warn('⚠️ Falha na IA Gemini para classificação, usando fallback:', iaErr.message);
          classificacao = await classificacaoService.classificarDespesa({
            fornecedor: extractedData.fornecedor,
            faturado: extractedData.faturado,
            descricaoProdutos: extractedData.descricaoProdutos,
            valorTotal: extractedData.valorTotal,
            dataEmissao: extractedData.dataEmissao
          });
        }
      } catch (error) {
        console.warn('Erro na classificação automática:', error.message);
      }
      
      return {
        ...extractedData,
        tipo_despesa_sugerido: tipoDespesa,
        classificacao,
        arquivo_original: filename,
        texto_extraido: pdfText
      };
    } catch (error) {
      throw new Error(`Erro ao processar nota fiscal: ${error.message}`);
    }
  }

  async extractDataWithGemini(pdfText) {
    // Se IA estiver indisponível, usa extração básica imediatamente
    if (!this.model) {
      const basic = await this.extractDataBasic(pdfText);
      return { ...basic, ai_status: 'disabled', ai_error: null };
    }

    const prompt = `
Você é um especialista em análise de notas fiscais brasileiras. Analise o texto extraído de uma nota fiscal e extraia os seguintes dados em formato JSON:

CAMPOS OBRIGATÓRIOS:
- numero: Número da nota fiscal
- serie: Série da nota fiscal  
- dataEmissao: Data de emissão (formato YYYY-MM-DD)
- fornecedor: {
  - razaoSocial: Razão social do fornecedor
  - nomeFantasia: Nome fantasia (se houver)
  - cnpj: CNPJ do fornecedor (apenas números)
  - endereco: Endereço completo do fornecedor
}
- faturado: {
  - nomeCompleto: Nome completo da pessoa/empresa faturada
  - cpf: CPF da pessoa faturada (apenas números, se for pessoa física)
  - cnpj: CNPJ da empresa faturada (apenas números, se for pessoa jurídica)
  - endereco: Endereço completo do faturado
}
- descricaoProdutos: Descrição detalhada de todos os produtos/serviços
- valorTotal: Valor total da nota fiscal (apenas número, sem símbolos)
- dataVencimento: Data de vencimento (formato YYYY-MM-DD, se não especificada, use a data de emissão)
- quantidadeParcelas: Número de parcelas (padrão 1 se não especificado)

INSTRUÇÕES ESPECIAIS PARA NOME FANTASIA:
- O nome fantasia é diferente da razão social e geralmente aparece como "Nome Fantasia:", "Fantasia:", ou similar
- Procure por termos como "Nome Fantasia", "Fantasia", "Nome Comercial", "Nome de Fantasia"
- Se não encontrar um nome fantasia específico na nota fiscal, use null
- NÃO use a razão social como nome fantasia
- Seja criterioso: apenas extraia se houver um campo específico para nome fantasia

INSTRUÇÕES GERAIS:
1. Se algum campo não estiver disponível no texto, use null
2. Para CNPJ e CPF, extraia apenas os números (sem pontos, traços ou barras)
3. Para valores monetários, extraia apenas o número (sem R$, vírgulas como separador decimal use ponto)
4. Para datas, use sempre o formato YYYY-MM-DD
5. Seja preciso na extração dos dados
6. Se houver múltiplos produtos, liste todos na descrição

TEXTO DA NOTA FISCAL:
${pdfText}

Responda APENAS com o JSON válido, sem explicações adicionais:`;
    
    // Implementa retry com exponential backoff e timeout, com fallback para extração básica
    const maxRetries = 3;
    let tentativa = 0;
    let ultimoErro = null;
    let aiStatus = null;
    let aiErrorMessage = null;

    // Função para identificar erros recuperáveis (sobrecarregado/timeout/rate limit)
    const isRetryableError = (err) => {
      const msg = (err && err.message) ? err.message.toLowerCase() : '';
      return msg.includes('503') ||
             msg.includes('service unavailable') ||
             msg.includes('overloaded') ||
             msg.includes('timeout') ||
             msg.includes('rate limit');
    };

    // Função para identificar erro de quota excedida (429) e evitar retries inúteis
    const isQuotaExceeded = (err) => {
      const msg = (err && err.message) ? err.message.toLowerCase() : '';
      return msg.includes('429') ||
             msg.includes('too many requests') ||
             msg.includes('quota') ||
             msg.includes('exceeded your current quota');
    };

    // Função para identificar chave inválida/expirada ou chamada sem identidade
    const isInvalidKey = (err) => {
      const msg = (err && err.message) ? err.message.toLowerCase() : '';
      return msg.includes('api key invalid') ||
             msg.includes('api key expired') ||
             msg.includes('permission_denied') ||
             msg.includes("method doesn't allow unregistered callers");
    };

    while (tentativa < maxRetries) {
      try {
        // Exponential backoff com teto
        const waitMs = tentativa > 0 ? Math.min(2000 * Math.pow(2, tentativa - 1), 10000) : 0;
        if (waitMs > 0) {
          await new Promise(resolve => setTimeout(resolve, waitMs));
        }

        // Timeout de 15s para evitar travas
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout ao aguardar resposta da IA')), 15000);
        });

        const resultPromise = this.model.generateContent(prompt);
        const result = await Promise.race([resultPromise, timeoutPromise]);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Resposta do Gemini não contém JSON válido');
        }

        const extractedData = JSON.parse(jsonMatch[0]);
        return this.validateAndFormatData(extractedData);
      } catch (error) {
        ultimoErro = error;
        if (isInvalidKey(error)) {
          aiStatus = 'invalid_key';
          aiErrorMessage = error.message;
          console.warn('Chave Gemini inválida/expirada. Evitando novas tentativas.');
          break;
        }
        // Se quota foi excedida, interrompe imediatamente e usa fallback
        if (isQuotaExceeded(error)) {
          console.warn('Quota de Gemini excedida. Evitando novas tentativas.');
          break;
        }
        // Se erro não é recuperável, interrompe o loop
        if (!isRetryableError(error)) {
          break;
        }
        tentativa++;
      }
    }

    // Fallback para extração básica em caso de falha
    console.warn('Serviço de IA indisponível ou resposta inválida. Usando extração básica. Motivo:', ultimoErro ? ultimoErro.message : 'desconhecido');
    const basic = await this.extractDataBasic(pdfText);
    return { ...basic, ai_status: aiStatus || (isQuotaExceeded(ultimoErro) ? 'quota_exceeded' : 'fallback'), ai_error: aiErrorMessage || (ultimoErro ? ultimoErro.message : null) };
  }

  async extractDataBasic(pdfText) {
    // Extração básica usando regex para casos sem IA
    const data = {
      numero: null,
      serie: null,
      dataEmissao: null,
      fornecedor: {
        razaoSocial: null,
        nomeFantasia: null,
        cnpj: null,
        endereco: null
      },
      faturado: {
        nomeCompleto: null,
        cpf: null,
        cnpj: null,
        endereco: null
      },
      descricaoProdutos: 'Produtos/serviços da nota fiscal',
      valorTotal: 0,
      dataVencimento: null,
      quantidadeParcelas: 1
    };

    try {
      // Extrair número da nota fiscal
      const numeroMatch = pdfText.match(/(?:nota fiscal|nf|número|n[°º]?)\s*:?\s*(\d+)/i);
      if (numeroMatch) data.numero = numeroMatch[1];

      // Extrair CNPJ
      const cnpjMatch = pdfText.match(/(\d{2}\.?\d{3}\.?\d{3}\/\?\d{4}-?\d{2})/);
      if (cnpjMatch) {
        data.fornecedor.cnpj = cnpjMatch[1].replace(/[^\d]/g, '');
      }

      // Extrair valor total
      const valorMatch = pdfText.match(/(?:total|valor total|total geral)\s*:?\s*r?\$?\s*([\d.,]+)/i);
      if (valorMatch) {
        data.valorTotal = parseFloat(valorMatch[1].replace(/[^\d,]/g, '').replace(',', '.'));
      }

      // Extrair data
      const dataMatch = pdfText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      if (dataMatch) {
        const [dia, mes, ano] = dataMatch[1].split('/');
        data.dataEmissao = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        data.dataVencimento = data.dataEmissao; // Usar mesma data como vencimento
      }

      return this.validateAndFormatData(data);
    } catch (error) {
      console.warn('Erro na extração básica:', error);
      return data; // Retorna dados básicos mesmo com erro
    }
  }

  validateAndFormatData(data) {
    const formatCpfCnpj = (value) => {
      if (!value) return null;
      return value.toString().replace(/\D/g, '');
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      
      // Se já está no formato correto
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      
      // Tentar converter outros formatos comuns
      const dateFormats = [
        /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
        /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
        /(\d{4})\/(\d{2})\/(\d{2})/, // YYYY/MM/DD
      ];
      
      for (const format of dateFormats) {
        const match = dateStr.match(format);
        if (match) {
          if (format === dateFormats[0] || format === dateFormats[1]) {
            // DD/MM/YYYY ou DD-MM-YYYY
            return `${match[3]}-${match[2]}-${match[1]}`;
          } else {
            // YYYY/MM/DD
            return `${match[1]}-${match[2]}-${match[3]}`;
          }
        }
      }
      
      return null;
    };

    const formatValue = (value) => {
      if (!value) return 0;
      
      // Converter para string e remover caracteres não numéricos exceto vírgula e ponto
      const cleanValue = value.toString().replace(/[^\d,.-]/g, '');
      
      // Substituir vírgula por ponto para decimal
      const normalizedValue = cleanValue.replace(',', '.');
      
      return parseFloat(normalizedValue) || 0;
    };

    // Função para tratar o nome fantasia
    const formatNomeFantasia = (nomeFantasia, razaoSocial) => {
      // Se não há nome fantasia ou é null/undefined
      if (!nomeFantasia || nomeFantasia.trim() === '') {
        return '(Fornecedor nao tem nome fantasia)';
      }
      
      // Se o nome fantasia é igual à razão social, considera como não tendo nome fantasia
      if (razaoSocial && nomeFantasia.trim().toLowerCase() === razaoSocial.trim().toLowerCase()) {
        return '(Fornecedor nao tem nome fantasia)';
      }
      
      return nomeFantasia.trim();
    };

    return {
      numero: data.numero || null,
      serie: data.serie || null,
      dataEmissao: formatDate(data.dataEmissao),
      fornecedor: {
        razaoSocial: data.fornecedor?.razaoSocial || null,
        nomeFantasia: formatNomeFantasia(data.fornecedor?.nomeFantasia, data.fornecedor?.razaoSocial),
        cnpj: formatCpfCnpj(data.fornecedor?.cnpj),
        endereco: data.fornecedor?.endereco || null
      },
      faturado: {
        nomeCompleto: data.faturado?.nomeCompleto || null,
        cpf: formatCpfCnpj(data.faturado?.cpf),
        cnpj: formatCpfCnpj(data.faturado?.cnpj),
        endereco: data.faturado?.endereco || null
      },
      descricaoProdutos: data.descricaoProdutos || null,
      valorTotal: formatValue(data.valorTotal),
      dataVencimento: formatDate(data.dataVencimento) || formatDate(data.dataEmissao),
      quantidadeParcelas: parseInt(data.quantidadeParcelas) || 1
    };
  }

  async saveUploadedFile(file) {
    try {
      const uploadDir = path.join(__dirname, '../../uploads');
      
      // Criar diretório se não existir
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      const filename = `nota_fiscal_${timestamp}${extension}`;
      const filepath = path.join(uploadDir, filename);
      
      // Salvar arquivo
      fs.writeFileSync(filepath, file.buffer);
      
      return {
        filename,
        filepath,
        originalName: file.originalname,
        size: file.size
      };
    } catch (error) {
      throw new Error(`Erro ao salvar arquivo: ${error.message}`);
    }
  }

  async processUploadedPdf(file) {
    try {
      // Validar se é um arquivo PDF
      if (file.mimetype !== 'application/pdf') {
        throw new Error('Arquivo deve ser um PDF');
      }
      
      // Validar tamanho do arquivo (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('Arquivo muito grande. Máximo permitido: 10MB');
      }
      
      // Salvar arquivo
      const savedFile = await this.saveUploadedFile(file);
      
      // Processar PDF
      const extractedData = await this.processNotaFiscal(file.buffer, savedFile.filename);
      
      return {
        ...extractedData,
        arquivo: savedFile
      };
      
    } catch (error) {
      throw new Error(`Erro ao processar upload: ${error.message}`);
    }
  }
}

module.exports = NotaFiscalAgentService;