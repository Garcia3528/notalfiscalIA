const NotaFiscalAgentService = require('../services/NotaFiscalAgentService');
const Fornecedor = require('../models/Fornecedor');
const ContaPagar = require('../models/ContaPagar');

class PdfController {
  constructor() {
    this.notaFiscalAgent = new NotaFiscalAgentService();
    
    // Bind dos métodos para garantir que o this funcione corretamente
    this.uploadAndProcess = this.uploadAndProcess.bind(this);
    this.processAndSave = this.processAndSave.bind(this);
    this.reprocessPdf = this.reprocessPdf.bind(this);
    this.getProcessingHistory = this.getProcessingHistory.bind(this);
    this.filterUsefulData = this.filterUsefulData.bind(this);
  }

  // Retorna apenas dados úteis no JSON de resposta
  filterUsefulData(data) {
    if (!data || typeof data !== 'object') return data;

    return {
      numero: data.numero ?? null,
      serie: data.serie ?? null,
      dataEmissao: data.dataEmissao ?? null,
      fornecedor: {
        razaoSocial: data.fornecedor?.razaoSocial ?? null,
        nomeFantasia: data.fornecedor?.nomeFantasia ?? null,
        cnpj: data.fornecedor?.cnpj ?? null,
        endereco: data.fornecedor?.endereco ?? null
      },
      faturado: {
        nomeCompleto: data.faturado?.nomeCompleto ?? null,
        cpf: data.faturado?.cpf ?? null,
        cnpj: data.faturado?.cnpj ?? null,
        endereco: data.faturado?.endereco ?? null
      },
      descricaoProdutos: data.descricaoProdutos ?? null,
      valorTotal: data.valorTotal ?? 0,
      dataVencimento: data.dataVencimento ?? null,
      quantidadeParcelas: data.quantidadeParcelas ?? 1,
      tipo_despesa_sugerido: data.tipo_despesa_sugerido ?? null
    };
  }

  async uploadAndProcess(req, res) {
    try {
      // Verificar se foi enviado um arquivo
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum arquivo foi enviado'
        });
      }

      // Processar o PDF
      const result = await this.notaFiscalAgent.processUploadedPdf(req.file);
      const filtered = this.filterUsefulData(result);

      res.json({
        success: true,
        message: 'PDF processado com sucesso',
        data: filtered
      });

    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  }

  async processAndSave(req, res) {
    try {
      // Verificar se foi enviado um arquivo
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum arquivo foi enviado'
        });
      }

      // Processar o PDF
      const extractedData = await this.notaFiscalAgent.processUploadedPdf(req.file);

      // Verificar/criar fornecedor
      let fornecedor = null;
      if (extractedData.fornecedor && extractedData.fornecedor.cnpj) {
        // Buscar fornecedor existente
        const fornecedorExistente = await Fornecedor.findByCnpj(extractedData.fornecedor.cnpj);
        
        if (fornecedorExistente) {
          fornecedor = fornecedorExistente;
        } else {
          // Criar novo fornecedor
          fornecedor = await Fornecedor.criar({
            razao_social: extractedData.fornecedor.razaoSocial,
            nome_fantasia: extractedData.fornecedor.nomeFantasia,
            cnpj: extractedData.fornecedor.cnpj,
            endereco: extractedData.fornecedor.endereco,
            ativo: true
          });
        }
      }

      // Preparar dados para conta a pagar
      const contaPagarData = {
        descricao: `Nota Fiscal ${extractedData.numero}${extractedData.serie ? `/${extractedData.serie}` : ''} - ${extractedData.descricaoProdutos}`,
        valor_total: extractedData.valorTotal,
        data_vencimento: extractedData.dataVencimento,
        quantidade_parcelas: extractedData.quantidadeParcelas,
        fornecedor_id: fornecedor ? fornecedor.id : null,
        numero_nota_fiscal: extractedData.numero,
        serie_nota_fiscal: extractedData.serie,
        data_emissao: extractedData.dataEmissao,
        arquivo_pdf: extractedData.arquivo.filename,
        tipos_despesa: extractedData.tipo_despesa_sugerido ? [extractedData.tipo_despesa_sugerido.id] : []
      };

      // Criar conta a pagar
      const contaPagar = await ContaPagar.criar(contaPagarData);

      res.json({
        success: true,
        message: 'PDF processado e conta a pagar criada com sucesso',
        data: {
          extractedData: this.filterUsefulData(extractedData),
          fornecedor,
          contaPagar
        }
      });

    } catch (error) {
      console.error('Erro ao processar e salvar PDF:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  }

  async reprocessPdf(req, res) {
    try {
      const { filename } = req.params;
      
      if (!filename) {
        return res.status(400).json({
          success: false,
          message: 'Nome do arquivo é obrigatório'
        });
      }

      const fs = require('fs');
      const path = require('path');
      
      const filepath = path.join(__dirname, '../../uploads', filename);
      
      // Verificar se arquivo existe
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({
          success: false,
          message: 'Arquivo não encontrado'
        });
      }

      // Ler arquivo
      const pdfBuffer = fs.readFileSync(filepath);
      
      // Processar novamente
      const result = await this.notaFiscalAgent.processNotaFiscal(pdfBuffer, filename);
      const filtered = this.filterUsefulData(result);

      res.json({
        success: true,
        message: 'PDF reprocessado com sucesso',
        data: filtered
      });

    } catch (error) {
      console.error('Erro ao reprocessar PDF:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  }

  async getProcessingHistory(req, res) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const uploadDir = path.join(__dirname, '../../uploads');
      
      if (!fs.existsSync(uploadDir)) {
        return res.json({
          success: true,
          data: []
        });
      }

      const files = fs.readdirSync(uploadDir);
      const pdfFiles = files.filter(file => file.endsWith('.pdf'));
      
      const history = pdfFiles.map(filename => {
        const filepath = path.join(uploadDir, filename);
        const stats = fs.statSync(filepath);
        
        return {
          filename,
          uploadDate: stats.birthtime,
          size: stats.size,
          sizeFormatted: this.formatFileSize(stats.size)
        };
      });

      // Ordenar por data de upload (mais recente primeiro)
      history.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = new PdfController();