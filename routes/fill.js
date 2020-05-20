var express = require('express');
var router = express.Router();
var randomstring = require("randomstring");

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
  res.render('new', {user:req.session.user});
});
router.post('/', async function(req, res, next){
  
});
module.exports = router;
