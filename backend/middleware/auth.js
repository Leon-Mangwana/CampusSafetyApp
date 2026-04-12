const { auth } = require('../config/firebase');

const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

const requireRole = (...roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { db } = require('../config/firebase');
    const userSnapshot = await db.ref(`users/${req.user.uid}`).once('value');
    const userData = userSnapshot.val();

    if (!userData || !roles.includes(userData.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    req.userRole = userData.role;
    next();
  };
};

module.exports = { authenticateUser, requireRole };
