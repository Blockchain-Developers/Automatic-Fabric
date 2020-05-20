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

router.get('/:id', async function(req, res, next) {
  con.query('select data from pending where id=?', req.params.id, async function(err, results){
    var data=await JSON.parse(results.[0].data);
    var decision=0;
    for(var i=0;i<data.orgcount;i++){
      if(data.org[i].name==req.session.user){
        decision=1;
      }
    }
    if(decision){
      res.render('fill', {id:req.params.id});
    }
    else{
      res.send('Illegal Request')
    }

  })

});
router.post('/:id', async function(req, res, next){
  console.log(req.body);
});
module.exports = router;
