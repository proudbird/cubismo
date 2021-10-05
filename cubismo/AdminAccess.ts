export default function Access(req, res, next) {

  const message = 'Access denied';
  function refuse(statusCode: number): void {
    res.status(statusCode).res.send({ error: true, message: message });
  }

  const key = req.header(process.env.API_KEY_HEADER);
  if(!key ) {
    return refuse(401);
  }
  if(key !== process.env.API_KEY) {
    return refuse(403);
  }

  return next();
}