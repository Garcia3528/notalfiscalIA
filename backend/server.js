require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { isDatabaseConfigured } = require('./src/config/database');
const { isSupabaseConfigured, isSupabaseConnected, testSupabaseConnection } = require('./src/config/supabase');

// Importar rotas
const pdfRoutes = require('./src/routes/pdfRoutes');
const fornecedorRoutes = require('./src/routes/fornecedorRoutes');
const tipoDespesaRoutes = require('./src/routes/tipoDespesaRoutes');
const classificacaoRoutes = require('./src/routes/classificacaoRoutes');
const analiseRoutes = require('./src/routes/analiseRoutes');
const clienteRoutes = require('./src/routes/clienteRoutes');
const tipoReceitaRoutes = require('./src/routes/tipoReceitaRoutes');
const contaReceberRoutes = require('./src/routes/contaReceberRoutes');
const contaPagarRoutes = require('./src/routes/contaPagarRoutes');
const faturadoRoutes = require('./src/routes/faturadoRoutes');
const ragRoutes = require('./src/routes/ragRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de segurança
app.use(helmet());

// A aplicação roda atrás de proxy na Render; isso garante IP correto para rate limit
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP por janela de tempo
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em 15 minutos.'
  },
  // Não limitar rotas de healthcheck
  skip: (req) => {
    const p = req.path || '';
    return p === '/health' || p === '/api/health';
  }
});
app.use(limiter);

// Rate limiting específico para upload de PDF
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // máximo 5 uploads por minuto
  message: {
    success: false,
    message: 'Muitos uploads. Tente novamente em 1 minuto.'
  }
});

// CORS
// Permitir configuração via FRONTEND_URL (pode vir com múltiplos separados por vírgula)
const frontendOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Permite configurar origens adicionais via variável de ambiente
const extraOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...frontendOrigins,
  'http://localhost:5174',
  'https://localhost:5173',
  'https://localhost:5174',
  ...extraOrigins,
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir chamadas de ferramentas e servidores internos (sem origin)
    if (!origin) return callback(null, true);
    // Libera localhost (http/https) em desenvolvimento
    if (origin.startsWith('http://localhost') || origin.startsWith('https://localhost')) {
      return callback(null, true);
    }
    // Libera origens configuradas
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: Origem não permitida: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware de log
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rotas
app.use('/api/pdf', pdfRoutes);
app.use('/api/fornecedores', fornecedorRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/tipos-despesa', tipoDespesaRoutes);
app.use('/api/tipos-receita', tipoReceitaRoutes);
app.use('/api/classificacao', classificacaoRoutes);
app.use('/api/analise', analiseRoutes);
app.use('/api/contas-receber', contaReceberRoutes);
app.use('/api/contas-pagar', contaPagarRoutes);
app.use('/api/faturados', faturadoRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Alias de health dentro do namespace da API
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Status detalhado de configuração (CORS, Banco)
app.get('/api/status', async (req, res) => {
  let supabaseConn = false;
  try {
    supabaseConn = isSupabaseConfigured && isSupabaseConnected && await testSupabaseConnection();
  } catch (_) {
    supabaseConn = false;
  }

  const postgresConfigured = !!isDatabaseConfigured;

  res.json({
    success: true,
    environment: process.env.NODE_ENV || 'development',
    cors: {
      allowedOrigins,
    },
    database: {
      supabase: {
        configured: !!isSupabaseConfigured,
        connected: !!supabaseConn,
      },
      postgres: {
        configured: !!postgresConfigured,
      },
      active: supabaseConn ? 'supabase' : (postgresConfigured ? 'postgres' : 'none')
    }
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API NotaFiscal - Sistema de Extração de Dados',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      apiHealth: '/api/health',
      pdf: {
        upload: 'POST /api/pdf/upload',
        processAndSave: 'POST /api/pdf/process-and-save',
        reprocess: 'POST /api/pdf/reprocess/:filename',
        history: 'GET /api/pdf/history'
      },
      fornecedores: {
        listar: 'GET /api/fornecedores',
        buscar: 'GET /api/fornecedores/buscar',
        buscarPorId: 'GET /api/fornecedores/:id',
        criar: 'POST /api/fornecedores',
        atualizar: 'PUT /api/fornecedores/:id',
        inativar: 'PATCH /api/fornecedores/:id/inativar',
        reativar: 'PATCH /api/fornecedores/:id/reativar'
      },
      tiposDespesa: {
        listar: 'GET /api/tipos-despesa',
        categorias: 'GET /api/tipos-despesa/categorias',
        buscar: 'GET /api/tipos-despesa/buscar',
        classificar: 'POST /api/tipos-despesa/classificar',
        buscarPorId: 'GET /api/tipos-despesa/:id',
        criar: 'POST /api/tipos-despesa',
        atualizar: 'PUT /api/tipos-despesa/:id',
        inativar: 'PATCH /api/tipos-despesa/:id/inativar',
        reativar: 'PATCH /api/tipos-despesa/:id/reativar'
      },
      clientes: {
        listar: 'GET /api/clientes',
        buscar: 'GET /api/clientes/buscar',
        buscarPorId: 'GET /api/clientes/:id',
        criar: 'POST /api/clientes',
        atualizar: 'PUT /api/clientes/:id',
        inativar: 'PATCH /api/clientes/:id/inativar',
        reativar: 'PATCH /api/clientes/:id/reativar'
      },
      tiposReceita: {
        listar: 'GET /api/tipos-receita',
        porCategoria: 'GET /api/tipos-receita/categoria/:categoria',
        buscarPorId: 'GET /api/tipos-receita/:id',
        criar: 'POST /api/tipos-receita',
        atualizar: 'PUT /api/tipos-receita/:id',
        inativar: 'PATCH /api/tipos-receita/:id/inativar',
        reativar: 'PATCH /api/tipos-receita/:id/reativar'
      },
      contasReceber: {
        listar: 'GET /api/contas-receber',
        buscarPorId: 'GET /api/contas-receber/:id',
        criar: 'POST /api/contas-receber',
        atualizar: 'PUT /api/contas-receber/:id',
        inativar: 'PATCH /api/contas-receber/:id/inativar',
        reativar: 'PATCH /api/contas-receber/:id/reativar'
      },
      contasPagar: {
        listar: 'GET /api/contas-pagar',
        buscarPorId: 'GET /api/contas-pagar/:id',
        criar: 'POST /api/contas-pagar',
        atualizar: 'PUT /api/contas-pagar/:id',
        inativar: 'PATCH /api/contas-pagar/:id/inativar',
        reativar: 'PATCH /api/contas-pagar/:id/reativar'
      },
      faturados: {
        listar: 'GET /api/faturados',
        buscar: 'GET /api/faturados/buscar',
        buscarPorId: 'GET /api/faturados/:id',
        criar: 'POST /api/faturados',
        atualizar: 'PUT /api/faturados/:id',
        inativar: 'PATCH /api/faturados/:id/inativar',
        reativar: 'PATCH /api/faturados/:id/reativar'
      },
      rag: {
        indexar: 'POST /api/rag/index',
        simples: 'POST /api/rag/simple',
        embeddings: 'POST /api/rag/embeddings'
      },
      classificacao: {
        classificar: 'POST /api/classificacao/classificar',
        lote: 'POST /api/classificacao/lote',
        sugestoes: 'POST /api/classificacao/sugestoes',
        categorias: 'GET /api/classificacao/categorias',
        categoria: 'GET /api/classificacao/categorias/:categoria',
        feedback: 'POST /api/classificacao/feedback',
        teste: 'GET /api/classificacao/teste'
      },
      analise: {
        verificar: 'POST /api/analise/verificar',
        registrar: 'POST /api/analise/registrar'
      }
    }
  });
});

// Middleware de tratamento de erros 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Middleware de tratamento de erros globais
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📄 API docs: http://localhost:${PORT}/`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  console.error('Erro não capturado:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rejeitada não tratada:', reason);
  process.exit(1);
});

module.exports = app;
