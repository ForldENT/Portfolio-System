// ──────────────────────────────────────────────────────────────
//  server/routes/auth.js  — 로그인/로그아웃
// ──────────────────────────────────────────────────────────────
const express  = require('express');
const passport = require('passport');
const router   = express.Router();

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/?error=login_failed' }),
  (req, res) => res.redirect(`/u/${req.user.username}`)
);

router.get('/logout', (req, res) => req.logout(() => res.redirect('/')));

router.get('/me', (req, res) => {
  if (req.isAuthenticated())
    return res.json({ loggedIn: true, id: req.user.id, username: req.user.username, avatar: req.user.avatar });
  res.json({ loggedIn: false });
});

module.exports = router;
