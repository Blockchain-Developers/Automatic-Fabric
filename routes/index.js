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
  con.query('select data, role, keyexists from users where username=?', req.session.user, function(err, results){
    var data={};
    var pending={};
    var finished={};
    if(results[0].role=='user'){
      if(results[0].keyexists){
        data=JSON.parse(results[0].data);
        res.render('index', {user:req.session.user, isadmin:req.session.admin, data:data});
      } else{
        res.render('genkey', {user:req.session.user});
      }
    }
    else{
      con.query('select id, created from pending;select id, created from networks',[] ,function(err, results){
        pending=results[0];
        finished=results[1];
        res.render('index', {user:req.session.user, isadmin:req.session.admin, pending:pending, finished:finished});
      })
    }

  });
});
module.exports = router;
