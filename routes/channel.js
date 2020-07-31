let createError = require('http-errors');
let express = require("express");
let router = express.Router();
let randomstring = require("randomstring");
const { promisify } = require("util");
const utilities = require('../src/utilities');
const mysql = require("mysql");
const con = mysql.createConnection({
    host: "localhost",
    user: "nodejs",
    password: "nodejspassword",
    database: "users",
    multipleStatements: true,
});

const queryAsync = promisify(con.query).bind(con);

/* GET home page. */

router.get("/:id/new", async function (req, res) {
  con.query('select * from networks where id=?', req.params.id, function(err, results){
    if(results.length){
      let data=JSON.parse(results[0].data);
      let orgs=[];
      data=data.data;
      for(let i=0;i<data.length;i++){
        orgs.push(data[i].name);
      }
      res.render("channel-new", { id: req.params.id, orgs:orgs, user:req.session.user});
    }
  });
});
router.post("/:id/new", async function (req, res) {
  let str = "";
  for (let i = 0; i < req.body.fields.length; i++) {
      if (i != 0) {
          str += ", ";
      }
      str += "'";
      str += req.body.fields[i];
      str += "'";
  }
  let err,
      results = await queryAsync(
          "select username from users where role=? and username in (" +
              str +
              ") and data like ?",
          ["user", '%'+req.params.id+'%']
      );
    if(err) {
      console.log(err);
    }
  let data=[];
  let participants=[];
  for(let i=0;i<results.length;i++){
    participants.push(results[i].username);
    data.push({participant:results[i].username, decision:0});
  }
  let channelid = await randomstring.generate({
      length: 10,
      charset: "numeric",
  });
  str = "";
  for (let i = 0; i < participants.length; i++) {
     if (i != 0) {
         str += ", ";
     }
     str += "'";
     str += participants[i];
     str += "'";
  }
  con.query("select data, username from users where role=? and username in (" +str + ")", 'user', function(err, results){
    for(let i=0;i<results.length;i++){
      let data={};
      if(results[i]){
          data=JSON.parse(results[i].data);
      }
      if(!data.pendingchannels){
        data.pendingchannels=[];
      }
      data.pendingchannels.push({id:channelid, network:req.params.id, decision:0});
      data=JSON.stringify(data);
      con.query('update users set data=? where username=?', [data, results[i].username]);
    }
  });
  data=JSON.stringify(data);
  con.query('insert into channels set id=?, network=?, data=?, status=?', [channelid, req.params.id, data, 'pending']);
  res.redirect('/network/'+req.params.id);
});
router.get("/:networkid/:what/:channelid", async function (req, res) {
  let err, results = await queryAsync(
          "select username, data from users where role=? and username =? and data like ?",
          ['user', req.session.user, '%'+req.params.networkid+'%']
      );
  if(err) {
    console.log(err);
  }
  if(results.length){
    if(req.params.what=='join'){
      let data={};
      data=JSON.parse(results[0].data);
      for(let i=0;i<data.pendingchannels.length;i++){
        if(data.pendingchannels[i].id==req.params.channelid){
          data.pendingchannels[i].decision=1;
        }
      }
      data=JSON.stringify(data);
      con.query('update users set data=? where username=?', [data, req.session.user]);

      con.query('select data from channels where id=? and network=?', [req.params.channelid, req.params.networkid], function(err, results){
        let data=JSON.parse(results[0].data);
        let cnt=0;
        let orgs=[];
        for(let i=0;i<data.length;i++){
          if(data[i].participant==req.session.user){
            data[i].decision=1;
          }
        }
        //render page to sign join channel command

        //
        data=JSON.stringify(data);
        con.query('update channels set data=? where id=? and network=?', [data, req.params.channelid, req.params.networkid]);
      });
    }else if(req.params.what=='details'){
      console.log('details');
    }
    res.redirect('/network/'+req.params.networkid);
  }
  else{
    createError(403);
  }

});
module.exports = router;
