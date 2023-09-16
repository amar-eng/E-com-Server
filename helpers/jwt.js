const { expressjwt: jwt } = require('express-jwt');

function authJwt() {
  const secret = process.env.SECRET;
  const api = process.env.API_URL;

  return jwt({
    secret,
    algorithms: ['HS256'],
    isRevoked: isRevoked,
  }).unless({
    path: [
      { url: /\/public\/uploads(.*)/, methods: ['GET', 'OPTIONS'] },
      { url: /\/api\/products(.*)/, methods: ['GET', 'OPTIONS'] },
      { url: /\/api\/categories(.*)/, methods: ['GET', 'OPTIONS'] },
      { url: /\/api\/orders(.*)/, methods: ['GET', 'OPTIONS', 'POST'] },
      `${api}/users/login`,
      `${api}/users/register`,
      `${api}/users/logout`,
    ],
  });
}

async function isRevoked(req, token) {
  if (token.payload.isAdmin == false) {
    return true;
  }
  return false;
}

module.exports = authJwt;
