let express = require('express');
let router = express.Router();
const passwordHash = require('password-hash');
const mysql = require('mysql');
const con = mysql.createConnection({
  host: 'localhost',
  user: 'nodejs',
  password: 'nodejspassword',
  database: 'users',
  multipleStatements: true
});

router.post('/', async function(req, res, next) {
console.log(req.body.username);
  con.query('select passwordhash, role from users where username=? and status="active"', req.body.username, async function(err, results) {
    if (results.length) {
      const check = await passwordHash.verify(req.body.password, results[0].passwordhash);
      // 'test' '1234567890' 'sha1$66dd990b$1$fda00d8554b530a5e7eaa3ca3defae9574d47ebd'
      if (check) {
        req.session.user = req.body.username;
        req.session.authorized = 'authorized';
        if (results[0].role == 'admin') {
          req.session.admin = true;
        } else {
          req.session.admin = false;
        }
        res.redirect('/');
      } else {
        res.redirect('/');
      }
    } else {
      res.redirect('/');
    }
  });
});
module.exports = router;
