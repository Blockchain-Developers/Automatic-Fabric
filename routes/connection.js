let express = require('express');
let router = express.Router();
const mysql = require('mysql');
let createError = require('http-errors');
const con = mysql.createConnection({
  host: 'localhost',
  user: 'nodejs',
  password: 'nodejspassword',
  database: 'users',
  multipleStatements: true
});

/* GET home page. */

router.get('/:id', async function(req, res) {
  con.query('select data from networks where id=?', req.params.id, function(err, results){
    let data=JSON.parse(results[0].data);
    data=data.data;
    let found=0;
    let location='';
    let ccpfile='';
    let walletfile='';
    for(let i=0;i<data.length;i++){
      if(data[i].name==req.session.user){
        found=1;
        location=data[i].name+'-'+req.params.id+'.cathaybc-services.com';
        ccpfile=data[i].ccpfile;
        walletfile=data[i].walletfile;
      }
    }
    if(found){
      res.render('connection-data', {location:location, ccpfile:ccpfile, walletfile:walletfile});
    }
    else{
      createError(403);
    }
  });
});
module.exports = router;
