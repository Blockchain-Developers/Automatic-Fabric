var express = require('express');
var router = express.Router();
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
const mysql = require('mysql');
const con = mysql.createConnection({
  host: 'localhost',
  user: 'nodejs',
  password: 'nodejspassword',
  database: 'users',
  multipleStatements: true
});

var sessionStore = new MySQLStore({}, con);

/* GET home page. */
router.use(session(
{
        secret: 'asdfasdI0YOYiAxjOtR',
        resave: true,
        saveUninitialized: true,
        store: sessionStore,
        cookie:
        {
                maxAge: 1000 * 60 * 60
        },
        rolling: true,
}));

router.get('/', async function(req, res, next) {
  res.render('index', {user:req.session.user});
});
module.exports = router;
