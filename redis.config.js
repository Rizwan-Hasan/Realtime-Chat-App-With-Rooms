module.exports = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  family: Number(process.env.REDIS_FAMILY),
  db: Number(process.env.REDIS_DB),
  username: process.env.REDIS_USER,
  password: process.env.REDIS_PASSWD,
};
