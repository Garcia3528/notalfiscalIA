import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const PdfUpload = ({ onDataExtracted, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [classification, setClassification] = useState(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [activeTab, setActiveTab] = useState('formatted'); // 'formatted' ou 'json'

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (pdfFile) {
      handleFileSelect([pdfFile]);
    } else {
      setError('Por favor, selecione apenas arquivos PDF');
    }
  }, []);

  // Função para classificar despesa automaticamente
  const classifyExpense = useCallback(async (data) => {
    setIsClassifying(true);
    setClassification(null);
    
    try {
      const response = await axios.post(`${API_BASE}/classificacao/classificar`, {
        dadosExtraidos: data,
        opcoes: {
          usarIA: true,
          incluirSugestoes: true,
          limiteSugestoes: 3
        }
      });

      if (response.data.success) {
        setClassification(response.data.data);
      } else {
        console.error('Erro na classificação:', response.data.message);
      }
    } catch (error) {
      console.error('Erro na classificação automática:', error);
    } finally {
      setIsClassifying(false);
    }
  }, []);

  const handleFileSelect = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Por favor, selecione apenas arquivos PDF');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      setError('Arquivo muito grande. Tamanho máximo: 10MB');
      return;
    }

    setError(null);
    setExtractedData(null);
    setClassification(null);
    setUploadedFile(file); // Definir o arquivo carregado
    setIsProcessing(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await axios.post(`${API_BASE}/pdf/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      if (response.data.success) {
        const data = response.data.data;
        setExtractedData(data);
        onDataExtracted?.(data);
        
        // Classifica automaticamente após extração
        await classifyExpense(data);
      } else {
        throw new Error(response.data.message || 'Erro na extração');
      }

    } catch (error) {
      console.error('Erro no upload:', error);
      setError(error.response?.data?.message || error.message || 'Erro ao processar arquivo');
      onError?.(error.response?.data?.message || error.message || 'Erro ao processar arquivo');
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  }, [onDataExtracted, onError, classifyExpense]);

  const handleFileUpload = async (file) => {
    setError(null);
    setIsProcessing(true);
    setUploadedFile(file);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch(`${API_BASE}/pdf/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        const data = result.data;
        setExtractedData(data);
        if (onDataExtracted) {
          onDataExtracted(data);
        }
        
        // Classifica automaticamente após extração
        await classifyExpense(data);
      } else {
        throw new Error(result.message || 'Erro ao processar PDF');
      }
    } catch (err) {
      const errorMessage = err.message || 'Erro ao fazer upload do arquivo';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const clearUpload = () => {
    setUploadedFile(null);
    setExtractedData(null);
    setError(null);
    setIsProcessing(false);
    setClassification(null);
    setIsClassifying(false);
    setUploadProgress(0);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Extração de Dados de Nota Fiscal
          </h2>
          <p className="text-gray-600 mt-2">
            Carregue um PDF de nota fiscal e extraia os dados automaticamente usando IA
          </p>
        </div>

        <div className="p-6">
          {!uploadedFile && !isProcessing && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Selecione ou arraste um arquivo PDF
              </h3>
              <p className="text-gray-600 mb-4">
                Máximo 10MB • Apenas arquivos PDF
              </p>
              <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors">
                <Upload className="h-4 w-4 mr-2" />
                Escolher Arquivo
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {isProcessing && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Processando PDF...
              </h3>
              <p className="text-gray-600">
                Extraindo dados da nota fiscal usando IA. Isso pode levar alguns segundos.
              </p>
            </div>
          )}

          {uploadedFile && !isProcessing && (
            <div className="space-y-6">
              {/* Arquivo carregado */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-red-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">{uploadedFile.name}</h4>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(uploadedFile.size)} • PDF
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={clearUpload}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <h4 className="font-medium text-red-900">Erro no processamento</h4>
                  </div>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              )}

              {/* Classificação Automática */}
              {(isClassifying || classification) && (
                <div className="bg-white border border-gray-200 rounded-lg mb-6">
                  <div className="bg-blue-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      {isClassifying ? (
                        <Loader2 className="h-5 w-5 text-blue-500 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      )}
                      Classificação Automática
                    </h3>
                  </div>
                  
                  <div className="p-6">
                    {isClassifying ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mr-3" />
                        <span className="text-gray-600">Analisando e classificando despesa...</span>
                      </div>
                    ) : classification && (
                      <div className="space-y-6">
                        {/* Resultado Principal */}
                        <div className={`border rounded-lg p-4 ${
                          classification.classificacao.categoria === 'OUTRAS' || classification.classificacao.categoria === 'OUTROS' 
                            ? 'bg-amber-50 border-amber-200' 
                            : 'bg-green-50 border-green-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-800">Categoria Identificada</h4>
                            <span className={`text-sm px-2 py-1 rounded-full font-medium ${
                              classification.classificacao.confianca >= 0.8 
                                ? 'bg-green-100 text-green-800' 
                                : classification.classificacao.confianca >= 0.5 
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                            }`}>
                              {Math.round(classification.classificacao.confianca * 100)}% confiança
                            </span>
                          </div>
                          <div className={`text-lg font-bold mb-1 ${
                            classification.classificacao.categoria === 'OUTRAS' || classification.classificacao.categoria === 'OUTROS'
                              ? 'text-amber-700'
                              : 'text-green-900'
                          }`}>
                            {classification.classificacao.categoria_info?.nome || classification.classificacao.categoria}
                          </div>
                          <div className={`text-sm mb-2 ${
                            classification.classificacao.categoria === 'OUTRAS' || classification.classificacao.categoria === 'OUTROS'
                              ? 'text-amber-600'
                              : 'text-green-700'
                          }`}>
                            {classification.classificacao.categoria_info?.descricao || 
                             (classification.classificacao.subcategoria || 'Despesas não categorizadas')}
                          </div>
                          {(classification.classificacao.categoria === 'OUTRAS' || classification.classificacao.categoria === 'OUTROS') && (
                            <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                              Esta despesa não foi classificada em uma categoria específica. 
                              Você pode selecionar manualmente uma categoria mais adequada.
                            </div>
                          )}
                        </div>




                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sistema de Abas para Visualização dos Dados */}
              {extractedData && (
                <div className="bg-white border border-gray-200 rounded-lg">
                  {/* Cabeçalho com Abas */}
                  <div className="bg-gray-50 border-b border-gray-200">
                    <div className="flex">
                      <button
                        onClick={() => setActiveTab('formatted')}
                        className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'formatted'
                            ? 'border-blue-500 text-blue-600 bg-white'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Visualização Formatada
                      </button>
                      <button
                        onClick={() => setActiveTab('json')}
                        className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'json'
                            ? 'border-blue-500 text-blue-600 bg-white'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Dados em JSON
                      </button>
                    </div>
                  </div>

                  {/* Conteúdo das Abas */}
                  <div className="p-6">
                    {/* Aba Visualização Formatada */}
                    {activeTab === 'formatted' && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <h4 className="font-medium text-green-900">Dados extraídos com sucesso!</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Informações da Nota */}
                          <div className="space-y-3">
                            <h5 className="font-semibold text-gray-900">Informações da Nota</h5>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Número:</span>
                                <span className="ml-2 text-gray-900">{extractedData.numero || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Série:</span>
                                <span className="ml-2 text-gray-900">{extractedData.serie || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Data Emissão:</span>
                                <span className="ml-2 text-gray-900">{formatDate(extractedData.dataEmissao)}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Data Vencimento:</span>
                                <span className="ml-2 text-gray-900">{formatDate(extractedData.dataVencimento)}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Valor Total:</span>
                                <span className="ml-2 text-gray-900 font-semibold">{formatCurrency(extractedData.valorTotal)}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Parcelas:</span>
                                <span className="ml-2 text-gray-900">{extractedData.quantidadeParcelas || 1}</span>
                              </div>
                            </div>
                          </div>

                          {/* Fornecedor */}
                          <div className="space-y-3">
                            <h5 className="font-semibold text-gray-900">Fornecedor</h5>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Razão Social:</span>
                                <span className="ml-2 text-gray-900">{extractedData.fornecedor?.razaoSocial || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Nome Fantasia:</span>
                                <span className="ml-2 text-gray-900">{extractedData.fornecedor?.nomeFantasia || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">CNPJ:</span>
                                <span className="ml-2 text-gray-900">{extractedData.fornecedor?.cnpj || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Endereço:</span>
                                <span className="ml-2 text-gray-900">{extractedData.fornecedor?.endereco || 'N/A'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Faturado */}
                          <div className="space-y-3">
                            <h5 className="font-semibold text-gray-900">Faturado</h5>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Nome:</span>
                                <span className="ml-2 text-gray-900">{extractedData.faturado?.nomeCompleto || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">CPF:</span>
                                <span className="ml-2 text-gray-900">{extractedData.faturado?.cpf || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">CNPJ:</span>
                                <span className="ml-2 text-gray-900">{extractedData.faturado?.cnpj || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Endereço:</span>
                                <span className="ml-2 text-gray-900">{extractedData.faturado?.endereco || 'N/A'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Produtos/Serviços */}
                          <div className="space-y-3">
                            <h5 className="font-semibold text-gray-900">Produtos/Serviços</h5>
                            <div className="text-sm">
                              <p className="text-gray-900">{extractedData.descricaoProdutos || 'N/A'}</p>
                            </div>
                            {extractedData.tipo_despesa_sugerido && (
                              <div className="mt-3">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Tipo sugerido: {extractedData.tipo_despesa_sugerido.nome}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Presença/Ausência de Campos */}
                        <div className="mt-6">
                          <h5 className="font-semibold text-gray-900 mb-3">Validação dos Campos</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {[
                              { label: 'Número', present: !!extractedData.numero },
                              { label: 'Série', present: !!extractedData.serie },
                              { label: 'Data Emissão', present: !!extractedData.dataEmissao },
                              { label: 'Data Vencimento', present: !!extractedData.dataVencimento },
                              { label: 'Valor Total', present: extractedData.valorTotal != null },
                              { label: 'Parcelas', present: extractedData.quantidadeParcelas != null },
                              { label: 'Fornecedor - Razão Social', present: !!extractedData.fornecedor?.razaoSocial },
                              { label: 'Fornecedor - Nome Fantasia', present: !!extractedData.fornecedor?.nomeFantasia },
                              { label: 'Fornecedor - CNPJ', present: !!extractedData.fornecedor?.cnpj },
                              { label: 'Fornecedor - Endereço', present: !!extractedData.fornecedor?.endereco },
                              { label: 'Faturado - Nome', present: !!extractedData.faturado?.nomeCompleto },
                              { label: 'Faturado - CPF', present: !!extractedData.faturado?.cpf },
                              { label: 'Faturado - CNPJ', present: !!extractedData.faturado?.cnpj },
                              { label: 'Faturado - Endereço', present: !!extractedData.faturado?.endereco },
                              { label: 'Descrição de Produtos/Serviços', present: !!extractedData.descricaoProdutos }
                            ].map((field, idx) => (
                              <div key={idx} className={`flex items-center justify-between px-3 py-2 rounded border ${field.present ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                                <span className="text-sm text-gray-800">{field.label}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${field.present ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {field.present ? 'Presente' : 'Ausente'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Aba JSON */}
                    {activeTab === 'json' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Dados em JSON</h3>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
                              // Feedback visual
                              const button = event.target;
                              const originalText = button.textContent;
                              button.textContent = 'Copiado!';
                              button.className = button.className.replace('bg-blue-600 hover:bg-blue-700', 'bg-green-600');
                              setTimeout(() => {
                                button.textContent = originalText;
                                button.className = button.className.replace('bg-green-600', 'bg-blue-600 hover:bg-blue-700');
                              }, 2000);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            Copiar JSON
                          </button>
                        </div>
                        
                        <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
                          <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                            {JSON.stringify(extractedData, null, 2)}
                          </pre>
                        </div>
                        
                        <p className="text-sm text-gray-600">
                          Este JSON contém todos os dados extraídos da nota fiscal e pode ser usado para integração com outros sistemas.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfUpload;