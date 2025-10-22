const express = require('express');
const router = express.Router();
const PdfController = require('../controllers/PdfController');
const { handleUpload } = require('../middleware/upload');

/**
 * @route POST /api/pdf/upload
 * @desc Upload e processamento de PDF de nota fiscal (apenas extração)
 * @access Public
 */
router.post('/upload', handleUpload, PdfController.uploadAndProcess);

/**
 * @route POST /api/pdf/process-and-save
 * @desc Upload, processamento e salvamento automático de conta a pagar
 * @access Public
 */
router.post('/process-and-save', handleUpload, PdfController.processAndSave);

/**
 * @route POST /api/pdf/reprocess/:filename
 * @desc Reprocessar um PDF já enviado
 * @access Public
 */
router.post('/reprocess/:filename', PdfController.reprocessPdf);

/**
 * @route GET /api/pdf/history
 * @desc Buscar histórico de PDFs processados
 * @access Public
 */
router.get('/history', PdfController.getProcessingHistory);

module.exports = router;