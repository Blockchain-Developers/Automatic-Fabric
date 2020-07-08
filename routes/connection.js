var express = require('express');
var router = express.Router();
const mysql = require('mysql');
var createError = require('http-errors');
const con = mysql.createConnection({
  host: 'localhost',
  user: 'nodejs',
  password: 'nodejspassword',
  database: 'users',
  multipleStatements: true
});

/* GET home page. */

router.get('/:id', async function(req, res, next) {
  con.query('select data from networks where id=?', req.params.id, function(err, results){
    var data=JSON.parse(results[0].data);
    data=data.data;
    var found=0;
    var ports='';
    var location='';
    var orderertls='';
    var orgtls='';
    var adminsigncert='';
    var adminkeystore='';
    for(var i=0;i<data.length;i++){
      if(data[i].name==req.session.user){
        found=1;
        location=data[i].name+'-'+req.params.id+'.cathaybc-services.com';
        ports='Orderer: ';
        ports+=data[i].ports[0];
        ports+='; ';
        ports+='CA: ';
        ports+=data[i].ports[1];
        ports+='; ';
        ports+='Peers: ';
        for(var j=2;j<data[i].ports.length;j++){
          ports+=data[i].ports[j];
          ports+=', ';
        }
        orderertls=data[i].keyfiles[0];
        orgtls=data[i].keyfiles[1];
        adminsigncert=data[i].keyfiles[2];
        adminkeystore=data[i].keyfiles[3];
      }
    }
    if(found){
      res.render('connection-data', {location:location, ports:ports, orderertls:orderertls, orgtls:orgtls, adminsigncert:adminsigncert, adminkeystore:adminkeystore})
    }
    else{
      createError(403);
    }
  });
});
module.exports = router;
