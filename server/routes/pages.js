const express = require('express');
const path    = require('path');
const db      = require('../db');
const router  = express.Router();

router.get('/', (req, res) => res.sendFile(path.join(__dirname, '../../public/index.html')));

router.get('/u/:username', async (req, res) => {
  const user = await db.getUserByUsername(req.params.username);
  if (!user) return res.status(404).sendFile(path.join(__dirname, '../../public/404.html'));
  res.sendFile(path.join(__dirname, '../../public/portfolio.html'));
});

module.exports = router;
