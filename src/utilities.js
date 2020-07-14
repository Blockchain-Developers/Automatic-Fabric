var express = require("express");
var router = express.Router();
const axios = require('axios');

const mysql = require("mysql");
const con = mysql.createConnection({
    host: "localhost",
    user: "nodejs",
    password: "nodejspassword",
    database: "users",
    multipleStatements: true,
});


async function startchannel(orgs=[], networkid, channelid){
  console.log('mock start channel')
  console.log(orgs)
  console.log(networkid)
  console.log(channelid)
};

async function installchaincode(orgname, networkid, channelid, filename, ccname){
  console.log('mock install chaincode')
  console.log(orgname)
  console.log(networkid)
  console.log(channelid)
  console.log(filename)
  console.log(ccname)
}
module.exports =  {startchannel, installchaincode} ;
