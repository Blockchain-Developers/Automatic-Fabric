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
  var str='';
  for(var i=0;i<req.body.fields.length;i++){
    if(i!=0){
      str+=', ';
    }
    str+="'";
    str+=req.body.fields[i];
    str+="'";
  }
  con.query("select username from users where role=? and username in ("+str+")", ['user'], async function(err, results){
  if(results.length==req.body.fields.length){
  var data={};
  data.orgcount=req.body.fields.length;
  data.org=[];
  var id=await randomstring.generate({
    length: 10,
    charset: 'numeric'
  });

  for(var i=0;i<data.orgcount;i++){
    data.org.push({});
    data.org[i].name=req.body.fields[i];
    con.query('select username, data from users where username=?', req.body.fields[i], async function(err, results){
      var userdata=await JSON.parse(results[0].data);
      if(!userdata){
        userdata={};
      }
      if(!userdata.pending){
        userdata.pending=[];
        userdata.pending.push({});
        userdata.pending.id=id;
        userdata.pending.id.filled=0;
      }
      else{
        userdata.pending.push(id);
      }
      userdata_str=await JSON.stringify(userdata);
      con.query('update users set data=? where username=?', [userdata_str, results[0].username]);
    });
  }
  var data_str=await JSON.stringify(data);
  con.query('insert into pending set id=?, data=?', [id, data_str])
  res.send('success')
  }
  else
  {
    res.send('non-existence member detected')
  }
  });
});
module.exports = router;
