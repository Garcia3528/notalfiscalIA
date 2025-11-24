import { useState, useEffect } from 'react'
import axios from 'axios'
import PdfUpload from './components/PdfUpload'
import AnaliseLancamento from './components/AnaliseLancamento'
import RagConsulta from './components/RagConsulta'
import ManterPessoas from './components/ManterPessoas'
import ManterClassificacao from './components/ManterClassificacao'
import ManterContas from './components/ManterContas'
import './App.css'
import GeminiKeyModal from './components/GeminiKeyModal'

function App() {
  const [extractedData, setExtractedData] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('upload')

  // Define cabeçalho global do axios com a chave Gemini, se existir
  useEffect(() => {
    const key = localStorage.getItem('geminiKey')
    if (key) {
      axios.defaults.headers.common['X-Gemini-Key'] = key
    } else {
      delete axios.defaults.headers.common['X-Gemini-Key']
    }
  }, [])

  const handleDataExtracted = (data) => {
    setExtractedData(data)
    setError(null)
  }

  const handleError = (errorMessage) => {
    setError(errorMessage)
    setExtractedData(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GeminiKeyModal />
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                Sistema NotaFiscal
              </h1>
            </div>
            <nav className="flex items-center gap-2">
              <button onClick={() => setActiveTab('upload')} className={`px-3 py-2 rounded ${activeTab==='upload' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>Upload & IA</button>
              <button onClick={() => setActiveTab('pessoas')} className={`px-3 py-2 rounded ${activeTab==='pessoas' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>Manter Pessoas</button>
              <button onClick={() => setActiveTab('contas')} className={`px-3 py-2 rounded ${activeTab==='contas' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>Manter Contas</button>
              <button onClick={() => setActiveTab('classificacao')} className={`px-3 py-2 rounded ${activeTab==='classificacao' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>Manter Classificação</button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'upload' && (
          <>
            <PdfUpload 
              onDataExtracted={handleDataExtracted}
              onError={handleError}
            />
            {extractedData && (
              <AnaliseLancamento dadosExtraidos={extractedData} />
            )}
            {error && (
              <div className="mt-6 max-w-4xl mx-auto">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Erro no processamento</h3>
                      <div className="mt-2 text-sm text-red-700"><p>{error}</p></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <RagConsulta />
          </>
        )}

        {activeTab === 'pessoas' && <ManterPessoas />}
        {activeTab === 'contas' && <ManterContas />}
        {activeTab === 'classificacao' && <ManterClassificacao />}
      </main>


    </div>
  )
}

export default App
