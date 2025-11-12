const express = require('express');
const router = express.Router();
const RAGController = require('../controllers/RAGController');

// Indexar documentos em chunks com embeddings
router.post('/index', RAGController.index);

// Consulta RAG simples (keyword)
router.post('/simple', RAGController.simple);

// Consulta RAG por embeddings
router.post('/embeddings', RAGController.embeddings);

module.exports = router;