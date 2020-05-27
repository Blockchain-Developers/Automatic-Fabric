var express = require('express');
var router = express.Router();
var randomstring = require("randomstring");
const axios = require('axios');
const mysql = require('mysql');
const con = mysql.createConnection({
  host: 'localhost',
  user: 'nodejs',
  password: 'nodejspassword',
  database: 'users',
  multipleStatements: true
});
const secretkey='vNcbBNSVkVqzt9z2G643UA03VTC4z9es9tKbcAv4qtMcgV3oIdFutbHdAtWU';
/* GET home page. */

router.get('/:id', async function(req, res, next) {
  con.query('select data from pending where id=?', req.params.id, async function(err, results){
    var data=await JSON.parse(results[0].data);
    var decision=0;
    var orgnum;
    for(var i=0;i<data.orgcount;i++){
      if(data.org[i].name==req.session.user){
        decision=1;
	      orgnum=i;
      }
    }
    if(decision){
      data.org[orgnum].confirmed=1;
      con.query('update pending set data=? where id=?', [await JSON.stringify(data), req.params.id]);
      con.query('select data from users where username=?', req.session.user, async function(err, results){
        var data=await JSON.parse(results[0].data);
        for(var i=0;i<data.pending.length;i++){
          if(data.pending[i].id==req.params.id){
            data.pending[i].filled=2;
          }
        }
        con.query('update users set data=? where username=?', [JSON.stringify(data), req.session.user])
      });

      var check_finalize=1;
      for(var i=0;i<data.orgcount;i++){
        if(!data.org[i].confirmed){
          check_finalize=0;
        }
      }
      if(check_finalize){
        axios.post('http://localhost:3000/finalize/'+req.params.id+'/'+secretkey, data).catch(function(error){res.send(error)}).then(res.redirect('/'));
      }
      else{
        res.redirect('/')
      }
    }
    else{
      res.send('Illegal Request')
    }

  })
});
module.exports = router;
