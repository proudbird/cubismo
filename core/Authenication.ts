import Application from "../classes/application/Application";
import jwt from "jsonwebtoken"

export default async function Authenticate(application: Application, tokenKey: string, req, res, next, handler) {

  Logger.debug(`Trying to authenicate`);

  const token = req.headers["token"];
  Logger.debug(`Token is ${token}`);

  if (!token) {
    Logger.debug(`There is no token`);
    return res.status(403).send("A token is required for authenication");
  }

  try {
    Logger.debug(`Trying to detect user`);
    const decoded = jwt.verify(token, tokenKey) as any;
    let user = await application.users.findOne({ where: { id: decoded.userId }})
    if(!user) {
      return res.status(401).send("Invalid Token. User not found");
    }
    req.user = user;
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }

  if(handler) {
    Logger.debug(`Calling handler`);
    return handler(req, res);
  } else {
    Logger.debug(`Calling next`);
    return next();
  }
}