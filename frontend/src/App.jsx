import { useState } from 'react'
import PdfUpload from './components/PdfUpload'
import AnaliseLancamento from './components/AnaliseLancamento'
import RagConsulta from './components/RagConsulta'
import './App.css'

function App() {
  const [extractedData, setExtractedData] = useState(null)
  const [error, setError] = useState(null)

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
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                Sistema NotaFiscal
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PdfUpload 
          onDataExtracted={handleDataExtracted}
          onError={handleError}
        />

        {/* Etapa 2: Análise e Registro */}
        {extractedData && (
          <AnaliseLancamento dadosExtraidos={extractedData} />
        )}

        {/* Status Messages */}
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
                  <h3 className="text-sm font-medium text-red-800">
                    Erro no processamento
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Consulta RAG */}
        <RagConsulta />
      </main>


    </div>
  )
}

export default App
