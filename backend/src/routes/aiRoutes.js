const express = require('express');
const AIController = require('../controllers/AIController');

const router = express.Router();
const controller = new AIController();

// POST /api/ai/test-gemini
router.post('/test-gemini', async (req, res) => {
  await controller.testGemini(req, res);
});

module.exports = router;