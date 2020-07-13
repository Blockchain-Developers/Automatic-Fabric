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

router.get('/:id', async function(req, res, next) {
  con.query('select data, from users where username=?', req.session.user, function(err, results){
    var data={};
    data=JSON.parse(results[0].data);
    res.render('index', {user:req.session.user, id:req.parmas.id, data:data});

  });
});
module.exports = router;
