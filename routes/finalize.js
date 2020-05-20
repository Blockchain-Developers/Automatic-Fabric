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

router.post('/:id', async function(req, res, next) {
  console.log(req.body);
});
module.exports = router;
