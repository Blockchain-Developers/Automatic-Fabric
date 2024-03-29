let express = require('express');
let router = express.Router();
const mysql = require('mysql');
const con = mysql.createConnection({
  host: 'localhost',
  user: 'nodejs',
  password: 'nodejspassword',
  database: 'users',
  multipleStatements: true
});

/* GET home page. */

router.get('/:id', async function(req, res) {
  con.query('select data from users where username=?', req.session.user, function(err, results){
    let data=[];
    if(results[0]){
        data=JSON.parse(results[0].data);
    }
    res.render('network', {user:req.session.user, id:req.params.id, data:data});

  });
});
module.exports = router;
