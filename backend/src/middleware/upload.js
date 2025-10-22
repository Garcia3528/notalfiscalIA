const multer = require('multer');
const path = require('path');

// Configuração do multer para upload em memória
const storage = multer.memoryStorage();

// Filtro para aceitar apenas arquivos PDF
const fileFilter = (req, file, cb) => {
  // Verificar tipo MIME
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos PDF são permitidos'), false);
  }
};

// Configuração do multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
    files: 1 // Apenas 1 arquivo por vez
  }
});

// Middleware para upload de PDF único
const uploadPdf = upload.single('pdf');

// Wrapper para tratar erros do multer
const handleUpload = (req, res, next) => {
  uploadPdf(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Erros específicos do multer
      let message = 'Erro no upload do arquivo';
      
      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          message = 'Arquivo muito grande. Tamanho máximo: 10MB';
          break;
        case 'LIMIT_FILE_COUNT':
          message = 'Muitos arquivos. Envie apenas 1 arquivo por vez';
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          message = 'Campo de arquivo inesperado. Use o campo "pdf"';
          break;
        default:
          message = `Erro no upload: ${err.message}`;
      }
      
      return res.status(400).json({
        success: false,
        message: message
      });
    } else if (err) {
      // Outros erros (como filtro de arquivo)
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    // Se chegou até aqui, o upload foi bem-sucedido
    next();
  });
};

module.exports = {
  handleUpload,
  uploadPdf
};