export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const isAdminOrOwner = (req, res, next) => {
  console.log(req)
  console.log(req.params)
  console.log(req.user)
  const userId = req.params.id || req.body.id;
  console.log(req.user.role , req.user.id , userId)
  if (req.user.role === 'ADMIN' || req.user.id === userId) {
    return next();
  }
  
  res.status(403).json({ error: 'Access denied' });
};