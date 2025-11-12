import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const StatusBadge = ({ exists }) => (
  <span className={`px-2 py-1 rounded text-xs font-medium ${exists ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
    {exists ? 'EXISTE' : 'NÃO EXISTE'}
  </span>
);

const AnaliseLancamento = ({ dadosExtraidos }) => {
  const [verificacao, setVerificacao] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerResult, setRegisterResult] = useState(null);
  const [error, setError] = useState(null);

  if (!dadosExtraidos) return null;

  const handleVerificar = async () => {
    setIsVerifying(true);
    setError(null);
    setVerificacao(null);
    try {
      const { data } = await axios.post(`${API_BASE}/analise/verificar`, {
        dados: dadosExtraidos,
      });
      if (data?.success) {
        setVerificacao(data.data);
      } else {
        setError(data?.message || 'Erro ao verificar.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Erro ao verificar.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRegistrar = async () => {
    setIsRegistering(true);
    setError(null);
    setRegisterResult(null);
    try {
      const { data } = await axios.post(`${API_BASE}/analise/registrar`, {
        dados: dadosExtraidos,
        criarSeNaoExistir: true,
      });
      if (data?.success) {
        setRegisterResult(data.data);
      } else {
        setError(data?.message || 'Erro ao registrar.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Erro ao registrar.');
    } finally {
      setIsRegistering(false);
    }
  };

  const fornecedor = dadosExtraidos?.fornecedor || {};
  const faturado = dadosExtraidos?.faturado || {};
  const tipoDespesaNome = dadosExtraidos?.tipo_despesa_sugerido?.nome || null;

  const existsFornecedor = verificacao?.fornecedor?.status === 'EXISTE';
  const existsFaturado = verificacao?.faturado?.status === 'EXISTE';
  const existsDespesa = verificacao?.despesa?.status === 'EXISTE';

  return (
    <div className="mt-8 max-w-7xl mx-auto">
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Etapa 2 — Análise e Registro</h2>
          <p className="text-sm text-gray-600 mt-1">Verifica existência e registra Contas a Pagar a partir dos dados extraídos.</p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">Fornecedor</h3>
              {verificacao && <StatusBadge exists={existsFornecedor} />}
            </div>
            <p className="text-sm text-gray-700 mt-2">{fornecedor?.razaoSocial || '—'}</p>
            <p className="text-xs text-gray-500">CNPJ: {fornecedor?.cnpj || '—'}</p>
            {verificacao?.fornecedor?.id && (
              <p className="text-xs text-gray-500 mt-1">ID: {verificacao.fornecedor.id}</p>
            )}
          </div>

          <div className="bg-gray-50 rounded p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">Faturado</h3>
              {verificacao && <StatusBadge exists={existsFaturado} />}
            </div>
            <p className="text-sm text-gray-700 mt-2">{faturado?.nomeCompleto || faturado?.razaoSocial || '—'}</p>
            <p className="text-xs text-gray-500">Documento: {faturado?.cpf || faturado?.cnpj || '—'}</p>
            {verificacao?.faturado?.id && (
              <p className="text-xs text-gray-500 mt-1">ID: {verificacao.faturado.id}</p>
            )}
          </div>

          <div className="bg-gray-50 rounded p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">Despesa</h3>
              {verificacao && <StatusBadge exists={existsDespesa} />}
            </div>
            <p className="text-sm text-gray-700 mt-2">{tipoDespesaNome || '—'}</p>
            {verificacao?.despesa?.id && (
              <p className="text-xs text-gray-500 mt-1">ID: {verificacao.despesa.id}</p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center gap-3">
          <button
            onClick={handleVerificar}
            className="btn-secondary"
            disabled={isVerifying || isRegistering}
          >
            {isVerifying ? 'Verificando...' : 'Verificar Existência'}
          </button>

          <button
            onClick={handleRegistrar}
            className="btn-primary"
            disabled={isRegistering || isVerifying}
          >
            {isRegistering ? 'Registrando...' : 'Registrar Movimento'}
          </button>

          {error && (
            <span className="text-sm text-red-600 ml-2">{error}</span>
          )}
        </div>

        {registerResult && (
          <div className="p-6 border-t border-gray-200">
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="text-green-700 text-sm">Registro lançado com sucesso.</p>
              {registerResult?.movimento?.id && (
                <p className="text-green-700 text-xs mt-1">ID Movimento: {registerResult.movimento.id}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnaliseLancamento;