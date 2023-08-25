import jwt from 'jsonwebtoken';
import Application from '../classes/application/Application';
import Logger from '../common/Logger';

export default async function Authenticate(application: Application, tokenKey: string, req, res, next, handler) {
  // Logger.debug('Trying to authenicate');

  const token = req.cookies['Bearer'] || req.headers.token;;
  // Logger.debug(`Token is ${token}`);

  if (!token) {
    Logger.debug('There is no token');
    return res.status(403).send({ error: true, message: 'A token is required for authenication'});
  }

  let decoded: any;
  try {
    // Logger.debug('Trying to detect user');
    decoded = jwt.verify(token, tokenKey) as any;
    const user = await application.users.findOne({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).send({ error: true, message: 'User not found' });
    }
    req.user = user;
  } catch (err) {
    return res.status(401).send({ error: true, message: 'Invalid Token' });
  }

  if (handler) {
    // Logger.debug('Calling handler');
    return handler(req, res, decoded);
  }
  // Logger.debug('Calling next');
  return next();
}
