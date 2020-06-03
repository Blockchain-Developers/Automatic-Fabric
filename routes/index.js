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
  con.query('select data, role from users where username=?', req.session.user, function(err, results){
    var data;
    if(results[0].role=='user'){
      data=JSON.parse(results[0].data);
    }
    else{
      data={};
    }
    res.render('index', {user:req.session.user, isadmin:req.session.admin, data:data});
  });
});
module.exports = router;
