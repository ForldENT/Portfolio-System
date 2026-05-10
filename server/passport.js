// ──────────────────────────────────────────────────────────────
//  server/passport.js  — GitHub OAuth (async)
// ──────────────────────────────────────────────────────────────
const GitHubStrategy = require('passport-github2').Strategy;
const db = require('./db');

module.exports = function(passport) {
  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await db.getUserById(id);
      done(null, user || false);
    } catch(e) { done(e); }
  });

  passport.use(new GitHubStrategy({
    clientID:     process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL:  (process.env.APP_URL || 'http://localhost:3000') + '/auth/github/callback',
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await db.getUserById(profile.id);
      if (!user) {
        user = await db.createUser({
          id:        profile.id,
          username:  profile.username,
          avatar:    (profile.photos && profile.photos[0] && profile.photos[0].value) || '',
          github:    'https://github.com/' + profile.username,
          portfolio: db.defaultPortfolio(profile),
        });
        console.log('신규 가입:', profile.username);
      } else {
        console.log('로그인:', profile.username);
      }
      return done(null, user);
    } catch(e) { return done(e); }
  }));
};
