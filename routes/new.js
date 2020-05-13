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
  res.render('new');
});
router.post('/', async function(req, res, next){
  var data={};
  data.orgcount=req.body.fields.length;
  data.org=[];
  for(var i=0;i<data.orgcount;i++){
    data.org.push({});
    data.org[i].name=req.body.fields[i];
  }
  var id=await randomstring.generate({
    length: 10,
    charset: 'numeric'
  });
  data_str=await JSON.stringify(data);
  con.query('insert into pending set id=?, data=?', [id, data_str])
});
module.exports = router;
