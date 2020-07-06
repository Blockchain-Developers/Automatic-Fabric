var express = require('express');
var router = express.Router();
var randomstring = require("randomstring");
var passwordHash = require('password-hash');
const mysql = require('mysql');
const con = mysql.createConnection({
  host: 'localhost',
  user: 'nodejs',
  password: 'nodejspassword',
  database: 'users',
  multipleStatements: true
});

/* GET home page. */

router.get('/', async function(req, res, next) {
  res.render('admin')
});
router.post('/new', async function(req, res, next){
  const username=req.body.username;
  var password=await randomstring.generate(8);
  var hashedPassword = await passwordHash.generate(password);
  con.query('select * from users where username=?', username, function(err, results){
    if(!results.length){
      con.query('insert into users set username=?, passwordhash=?, role=?, status=?', [username, hashedPassword, 'User','Active']);
      res.render('user-created', {password:password})
    }
    else{
      res.redirect('back')
    }
  });
});
module.exports = router;
