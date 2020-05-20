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
    var data=await JSON.parse(results[0].data);
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
      data.org[orgnum].peercount=req.body.fields.length/2;
      data.org[orgnum].orderer={port:req.body.ordererport};
      data.org[orgnum].ca={port:req.body.caport};
      data.org[orgnum].peer=[];
      for(var i=0;i<data.org[orgnum].peercount;i++){
        data.org[orgnum].peer.push({name:req.body.fields[2*i],port:req.body.fields[2*i+1]});
      }
      con.query('update pending set data=? where id=?', [await JSON.stringify(data), req.params.id]);
      con.query('select data from users where username=?', req.session.user, async function(err, results){
        var data=await JSON.parse(results[0].data);
        for(var i=0;i<data.pending.length;i++){
          if(data.pending[i].id==req.params.id){
            data.pending[i].filled=1;
          }
        }
      });
      res.redirect('/')
    }
    else{
      res.send('Illegal Request')
    }

  })

});
module.exports = router;
