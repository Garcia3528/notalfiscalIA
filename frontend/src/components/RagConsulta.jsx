import { useState } from 'react'
import { API_BASE, getGeminiKey } from '../utils/apiBase'

export default function RagConsulta() {
  const [question, setQuestion] = useState('')
  const [mode, setMode] = useState('embeddings')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState([])

  const ask = async () => {
    setLoading(true)
    setError(null)
    setAnswer('')
    setSources([])
    try {
      const geminiKey = getGeminiKey()
      const res = await fetch(`${API_BASE}/rag/${mode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(geminiKey ? { 'X-Gemini-Key': geminiKey } : {})
        },
        body: JSON.stringify({ question })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || 'Falha na consulta')
      setAnswer(data.answer || '')
      setSources(data.sources || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 max-w-5xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Consulta com RAG</h2>
        <p className="text-sm text-gray-600 mt-1">Faça perguntas sobre o Banco de Dados e receba respostas elaboradas por IA com suporte de fontes.</p>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Pergunta</label>
          <textarea
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            rows={4}
            placeholder="Ex.: Quais categorias de despesa mais usadas nas últimas notas?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>

        <div className="mt-4 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Modo</label>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center">
              <input type="radio" name="ragmode" value="simple" checked={mode==='simple'} onChange={() => setMode('simple')} className="mr-2" />
              RAG Simples
            </label>
            <label className="inline-flex items-center">
              <input type="radio" name="ragmode" value="embeddings" checked={mode==='embeddings'} onChange={() => setMode('embeddings')} className="mr-2" />
              RAG Embeddings
            </label>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={ask}
            disabled={loading || !question.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
        </div>

        {error && (
          <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        {answer && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900">Resposta</h3>
            <div className="mt-2 whitespace-pre-wrap text-gray-800 bg-gray-50 border border-gray-200 rounded p-4">
              {answer}
            </div>
          </div>
        )}

        {sources && sources.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900">Fontes</h3>
            <ul className="mt-2 space-y-2">
              {sources.map((s, idx) => (
                <li key={s.id || idx} className="border border-gray-200 rounded p-3 bg-gray-50">
                  <div className="text-sm text-gray-700 font-semibold">{s.title || `Fonte ${idx+1}`}</div>
                  {typeof s.score === 'number' && (
                    <div className="text-xs text-gray-500">Relevância: {(s.score*100).toFixed(0)}%</div>
                  )}
                  <div className="text-sm text-gray-800 mt-1 line-clamp-3">{s.content}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
