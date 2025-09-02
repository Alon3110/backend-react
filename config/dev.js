export default  {
  dbURL: process.env.MONGO_URL || 'mongodb://127.0.0.1:27017',
  dbName : process.env.DB_NAME || 'tester_db'
}
