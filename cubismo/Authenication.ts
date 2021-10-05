import Application from "../classes/application/Application";
import jwt from "jsonwebtoken"

export default async function Authenticate(application: Application, req, res, next) {

  const token = req.headers["token"];

  if (!token) {
    return res.status(403).send("A token is required for authenication");
  }

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_KEY) as any;
    let user = await application.users.findOne({ where: { id: decoded.userId }})
    if(!user) {
      return res.status(401).send("Invalid Token. User not found");
    }
    req.user = user;
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }

  return next();
}