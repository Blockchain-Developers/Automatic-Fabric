let express = require("express");
let router = express.Router();
const axios = require('axios');
const openpgp = require('openpgp');
const fs = require("fs");
const mysql = require("mysql");
const con = mysql.createConnection({
    host: "localhost",
    user: "nodejs",
    password: "nodejspassword",
    database: "users",
    multipleStatements: true,
});

async function installchaincode(orgname, networkid, channelid, filename, ccname){
  console.log('mock install chaincode');
  console.log(orgname);
  console.log(networkid);
  console.log(channelid);
  console.log(filename);
  console.log(ccname);
}

async function signcommand(command){
  const privateKeyArmored = fs.readFileSync('./server.key', 'utf8');
  const { keys: [privateKey] } = await openpgp.key.readArmored(privateKeyArmored);
  const { signature: detachedSignature } = await openpgp.sign({
    message: openpgp.cleartext.fromText(command),
    privateKeys: [privateKey],
    detached: true
  });
  return detachedSignature;
}

module.exports =  {startchannel, installchaincode, signcommand} ;
