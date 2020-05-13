var express = require('express');
var router = express.Router();

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
  res.render('', {user:req.session.user, isadmin:req.session.admin});
});
router.post('/', async function(req, res, next){

});
module.exports = router;