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
  //res.redirect('/network/'+req.params.id);
  let err1,
      results1 = await queryAsync(
          "select data from networks where id=?",
          [req.params.id]
      );
  let networkdata = (JSON.parse(results1)).data;
  let initializer = 0;
  for(let i=0; i<networkdata.length; i++) {
    if(networkdata[i].name==req.session.user) {
      initializer = i;
    }
  }
  let command = 'export PATH="$PATH:/opt/gopath/src/github.com/hyperledger/fabric/bin";';
  command += 'export CORE_PEER_LOCALMSPID="' + networkdata[initializer].name + 'MSP";';
  command += 'export CORE_PEER_TLS_ROOTCERT_FILE=crypto-config/peerOrganizations/' + networkdata[initializer].name + '.com/peers/' + networkdata[initializer].peers[0] + '.' + networkdata[initializer].name + '.com/tls/ca.crt;';
  command += 'export CORE_PEER_MSPCONFIGPATH=crypto-config/peerOrganizations/' + networkdata[initializer].name + '.com/users/Admin@' + networkdata[initializer].name + '.com/msp;';
  command += 'export CORE_PEER_ADDRESS=' + networkdata[initializer].peers[0] + '.' + networkdata[initializer].name + '.com:' + networkdata[initializer].ports[2] + ';';
  command += 'peer channel fetch config config_block.pb -o orderer.ord-' + networkdata[initializer].name + '.com:' + networkdata[initializer].ports[1] + ' -c ' + channelid + ' --tls --cafile crypto-config/ordererOrganizations/ord-' + networkdata[initializer].name + '.com/msp/tlscacerts/tlsca.ord-' + networkdata[initializer].name + '.com-cert.pem;';
  command += 'configtxlator proto_decode --input config_block.pb --type common.Block | jq .data.data[0].payload.data.config > config.json;';
  for(let i=0; i<networkdata.length; i++) {
    if(i!=initializer) {
      command += 'jq -s \'.[0] * {"channel_group":{"groups":{"Application":{"groups": {"' + networkdata[i].name + 'MSP":.[1]}}}}}\' config.json ./' + networkdata[i].name + '.json > modified_config.json;';
    }
  }
  command += 'configtxlator proto_encode --input config.json --type common.Config --output config.pb;';
  command += 'configtxlator proto_encode --input modified_config.json --type common.Config --output modified_config.pb;';
  command += 'configtxlator compute_update --channel_id ' + channelid + ' --original config.pb --updated modified_config.pb --output update.pb;';
  command += 'configtxlator proto_decode --input update.pb --type common.ConfigUpdate | jq . > update.json;';
  command += 'echo \'{"payload":{"header":{"channel_header":{"channel_id":"\'' + channelid + '\'", "type":2}},"data":{"config_update":\'$(cat update.json)\'}}}\' | jq . > update_in_envelope.json;';
  command += 'configtxlator proto_encode --input update_in_envelope.json --type common.Envelope --output update_in_envelope.pb;';
  command += 'peer channel signconfigtx -f update_in_envelope.pb;';
  command += 'peer channel update -f update_in_envelope.pb -o orderer.ord-' + networkdata[initializer].name + '.com:' + networkdata[initializer].ports[1] + ' -c ' + channelid + ' --tls --cafile crypto-config/ordererOrganizations/ord-' + networkdata[initializer].name + '.com/msp/tlscacerts/tlsca.ord-' + networkdata[initializer].name + '.com-cert.pem;';
  const serversig = await utilities.signcommand(command);
  const url = networkdata[initializer].name + '-' + req.params.id + '.cathaybc-services.com';
  res.render('signing-portal', {command: command, serversig:serversig, url:url});
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

      con.query('select data from channels where id=? and network=?', [req.params.channelid, req.params.networkid], async function(err, results){
        let data=JSON.parse(results[0].data);
        let cnt=0;
        let orgs=[];
        for(let i=0;i<data.length;i++){
          if(data[i].participant==req.session.user){
            data[i].decision=1;
          }
        }
        //render page to sign join channel command
        let err1,
            results1 = await queryAsync(
                "select data from networks where id=?",
                [req.params.id]
            );
        let networkdata = (JSON.parse(results1)).data;
        let participant = 0;
        for(let i=0; i<networkdata.length; i++) {
          if(networkdata[i].name==req.session.user) {
            participant = i;
          }
        }
        let command = 'export PATH="$PATH:/opt/gopath/src/github.com/hyperledger/fabric/bin;';
        command += 'export CORE_PEER_LOCALMSPID="' + networkdata[participant].name + 'MSP";';
        command += 'export CORE_PEER_TLS_ROOTCERT_FILE=crypto-config/peerOrganizations/' + networkdata[participant].name + '.com/peers/' + networkdata[participant].peers[0] + '.' + networkdata[participant].name + '.com/tls/ca.crt;';
        command += 'export CORE_PEER_MSPCONFIGPATH=crypto-config/peerOrganizations/' + networkdata[participant].name + '.com/users/Admin@' + networkdata[participant].name + '.com/msp;';
        command += 'export CORE_PEER_ADDRESS=' + networkdata[participant].peers[0] + '.' + networkdata[participant].name + '.com:' + networkdata[participant].ports[2] + ';';
        command += 'peer channel fetch 0 ' + req.params.channelid + '.block -o orderer.ord-' + networkdata[participant].name + '.com:' + networkdata[participant].ports[1] + ' -c ' + req.params.channelid + ' --tls --cafile crypto-config/ordererOrganizations/ord-' + networkdata[participant].name + '.com/msp/tlscacerts/tlsca.ord-' + networkdata[participant].name + '.com-cert.pem;';
        for(let i=0;i<networkdata.peers.length;i++) {
          command += 'export CORE_PEER_TLS_ROOTCERT_FILE=crypto-config/peerOrganizations/' + networkdata[participant].name + '.com/peers/' + networkdata[participant].peers[i] + '.' + networkdata[participant].name + '.com/tls/ca.crt;';
          command += 'export CORE_PEER_ADDRESS=' + networkdata[participant].peers[i] + '.' + networkdata[participant].name + '.com:' + networkdata[participant].ports[i+2] + ';';
          command += 'peer channel join -b ' + req.params.channelid + '.block;';
        }
        const serversig = await utilities.signcommand(command);
        const url = networkdata[participant].name + '-' + req.params.id + '.cathaybc-services.com';
        res.render('signing-portal', {command: command, serversig:serversig, url:url});
        ///////////////
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
