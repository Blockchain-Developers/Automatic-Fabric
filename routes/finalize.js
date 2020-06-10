var express = require('express');
var router = express.Router();
var AdmZip = require('adm-zip');
var randomstring = require("randomstring");
var CronJob = require('cron').CronJob;
const fs = require('fs');
const fsExtra = require('fs-extra');
const YAML = require('json-to-pretty-yaml');
const insertLine = require('insert-line');
const write = require('write');
var cmd = require('node-cmd');
const aws =require('../src/aws');
const { promisfy } = require('util');

const secretkey = 'vNcbBNSVkVqzt9z2G643UA03VTC4z9es9tKbcAv4qtMcgV3oIdFutbHdAtWU';

const mysql = require('mysql');
const con = mysql.createConnection({
  host: 'localhost',
  user: 'nodejs',
  password: 'nodejspassword',
  database: 'users',
  multipleStatements: true
});

var dkyaml = [];
var port_num = 7;
var peer_num = 7;
var ca_num = 7;

var cleartemp = new CronJob('0 */10 * * * *', function() {
  fsExtra.emptyDir('files/temp')
}, null, true);
cleartemp.start();

function cryptoyamlgen(data) {
  let crypto;
  crypto = "{\"OrdererOrgs\":[";
  for (var i = 0; i < data.orgcount; i++) {
    if (i != 0) {
      crypto += ",";
    }
    crypto = crypto + "{\"Name\":\"ord-" + data.org[i].name + "\", \"Domain\":\"ord-" + data.org[i].name + ".com\", \"EnableNodeOUs\": true, \"Specs\":[{\"Hostname\": \"orderer\"}]}";
  }
  crypto = crypto + "], \"PeerOrgs\":[";
  for (var i = 0; i < data.orgcount; i++) {
    if (i != 0) {
      crypto += ",";
    }
    crypto = crypto + "{\"Name\":\"" + data.org[i].name + "\", \"Domain\":\"" + data.org[i].name + ".com\", \"EnableNodeOUs\": true, \"Specs\":[";
    crypto = crypto + "{\"Hostname\":\"" + data.org[i].peer[0].name + "\"}";
    for (var j = 1; j < data.org[i].peercount; j++) {
      crypto = crypto + ",{\"Hostname\":\"" + data.org[i].peer[j].name + "\"}";
    }
    crypto = crypto + "]}";
  }
  crypto = crypto + "]}";
  // console.log(crypto);
  const cryptojson = JSON.parse(crypto);
  const cryptoyaml = YAML.stringify(cryptojson);
  return (cryptoyaml);
}

function dckryamlgen(data, orgnumber) {
  let dckr;
  dckr = '{"version": "2",'; // HEAD_{
  dckr += '"volumes": {'; // volumes_{
  for (var i = 0; i < data.org[orgnumber].peercount; i++) { // peers
    dckr += '"' + data.org[orgnumber].peer[i].name + '.' + data.org[orgnumber].name + '.com": null,';
  }
  dckr += '"orderer.' + data.org[orgnumber].name + 'ord.com": null'; // orderer
  dckr += '},'; // volumes_}
  dckr += '"networks": {"testnet": null},'; //networks
  dckr += '"services": {'; // services_{
  dckr += '"orderer.ord-' + data.org[orgnumber].name + '.com": {'; // orderer.ord_{

  dckr += '"container_name": "orderer.ord-' + data.org[orgnumber].name + '.com",'; // container_name

  dckr += '"extends": {'; // extends_{
  dckr += '"file": "node-base.yaml",';
  dckr += '"service": "orderer-base"},'; // extends_}

  dckr += '"networks": ["testnet"],'; // networks

  dckr += '"environment": ["ORDERER_GENERAL_LOCALMSPID=' + data.org[orgnumber].name + 'OrdMSP"],'; //environment

  dckr += '"volumes": ['; // volumes_{
  dckr += '"./channel-artifacts/genesis.block:/var/hyperledger/orderer/orderer.genesis.block",';
  dckr += '"./crypto-config/ordererOrganizations/ord-' + data.org[orgnumber].name + '.com/orderers/orderer.ord-' + data.org[orgnumber].name + '.com/msp:/var/hyperledger/orderer/msp",';
  dckr += '"./crypto-config/ordererOrganizations/ord-' + data.org[orgnumber].name + '.com/orderers/orderer.ord-' + data.org[orgnumber].name + '.com/tls/:/var/hyperledger/orderer/tls",';
  dckr += '"orderer.' + data.org[orgnumber].name + 'ord.com:/var/hyperledger/production/orderer"],'; // volumes_}

  dckr += '"ports": ["' + (port_num + i).toString() + '050:7050"]'; // ports

  dckr += '},'; //orderer.ord_}

  for (var i = 0; i < data.org[orgnumber].peercount; i++) {
    dckr += '"' + data.org[orgnumber].peer[i].name + '.' + data.org[orgnumber].name + '.com": {'; // peer.org.com_{
    dckr += '"container_name": "' + data.org[orgnumber].peer[i].name + '.' + data.org[orgnumber].name + '.com",'; // container_name

    dckr += '"extends": {'; // extends_{
    dckr += '"file": "node-base.yaml",';
    dckr += '"service": "peer-base"';
    dckr += '},'; // extends_}

    dckr += '"networks": ["testnet"],'; // networks

    dckr += '"environment": ['; // environment_[
    dckr += '"CORE_PEER_ID=' + data.org[orgnumber].peer[i].name + '.' + data.org[orgnumber].name + '.com",';
    dckr += '"CORE_PEER_ADDRESS=' + data.org[orgnumber].peer[i].name + '.' + data.org[orgnumber].name + '.com:' + (port_num + orgnumber).toString() + '051",';
    dckr += '"CORE_PEER_LISTENADDRESS=0.0.0.0:' + (port_num + orgnumber).toString() + '051",';
    dckr += '"CORE_PEER_CHAINCODEADDRESS=' + data.org[orgnumber].peer[i].name + '.' + data.org[orgnumber].name + '.com:' + (port_num + orgnumber).toString() + '052",';
    dckr += '"CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:' + (port_num + orgnumber).toString() + '052",';
    dckr += '"CORE_PEER_GOSSIP_BOOTSTRAP=' + data.org[orgnumber].name + '.' + data.org[orgnumber].name + '.com:' + (port_num + orgnumber).toString() + '051",';
    if (!i) {
      dckr += '"CORE_PEER_GOSSIP_EXTERNALENDPOINT=' + data.org[orgnumber].peer[i].name + '.' + data.org[orgnumber].name + ".com:" + (port_num + orgnumber).toString() + '051",';
    }
    dckr += '"CORE_PEER_LOCALMSPID=' + data.org[orgnumber] + 'MSP"';
    dckr += '],';

    dckr += '"volumes": ['; // volumes_[
    dckr += '"/var/run/:/host/var/run/",';
    dckr += '"./crypto-config/peerOrganizations/' + data.org[orgnumber].name + '.com/peers/' + data.org[orgnumber].peer[i].name + '.' + data.org[orgnumber].name + '.com/msp:/etc/hyperledger/fabric/msp",';
    dckr += '"./crypto-config/peerOrganizations/' + data.org[orgnumber].name + '.com/peers/' + data.org[orgnumber].peer[i].name + '.' + data.org[orgnumber].name + '.com/tls:/etc/hyperledger/fabric/tls",';
    dckr += '"' + data.org[orgnumber].peer[i].name + '.' + data.org[orgnumber].name + '.com:/var/hyperledger/production"';
    dckr += '],'; // volumes_]

    dckr += '"ports": ["' + (peer_num++).toString() + '051:7051"]';
    dckr += '},'; // peer.org.com_}
  }

  dckr += '"ca.' + data.org[orgnumber].name + '.com": {'; // ca_{
  dckr += '"image": "hyperledger/fabric-ca:$IMAGE_TAG",';
  dckr += '"dns_search": ".",';
  dckr += '"environment": ['; // environment_[
  dckr += '"GODEBUG=netdns=go",';
  dckr += '"FABRIC_CA_HOME=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/' + data.org[orgnumber].name + '.com/ca",';
  dckr += '"FABRIC_CA_SERVER_CA_NAME=ca-' + data.org[orgnumber].name + '",';
  dckr += '"FABRIC_CA_SERVER_TLS_ENABLED=true",';
  dckr += '"FABRIC_CA_SERVER_TLS_CERTFILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/' + data.org[orgnumber].name + '.com/ca/ca.' + data.org[orgnumber].name + '.com-cert.pem",';
  dckr += '"FABRIC_CA_SERVER_TLS_KEYFILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/' + data.org[orgnumber].name + '.com/ca/${testnet_ca0_PRIVATE_KEY}",';
  dckr += '"FABRIC_CA_SERVER_PORT=' + (ca_num + orgnumber).toString() + '054"';
  dckr += '],'; // environment_]

  dckr += '"ports": ["' + (ca_num + orgnumber).toString() + '054:7054"],'; // ports

  dckr += '"command": "sh -c \'fabric-ca-server start --ca.certfile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/' + data.org[orgnumber].name + '.com/ca/ca.' + data.org[orgnumber].name + '.com-cert.pem --ca.keyfile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/' + data.org[orgnumber].name + '.com/ca/${testnet_ca_' + data.org[orgnumber].name + '_com_PRIVATE_KEY} -b admin:adminpw -d\'",'; // command

  dckr += '"volumes": ['; // volumes_[
  dckr += '"./crypto-config/peerOrganizations/' + data.org[orgnumber].name + '.com/ca/:/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/' + data.org[orgnumber].name + '.com/ca"';
  dckr += '],'; // volumes_]

  dckr += '"container_name": "ca_' + data.org[orgnumber].name + '",'; // container_name

  dckr += '"networks": ["testnet"]'; // networks

  dckr += '}'; // ca_}
  dckr += '}'; // services_}
  dckr += '}'; // HEAD_}

  const dckrjson = JSON.parse(dckr);
  const dckryaml = YAML.stringify(dckrjson);
  return (dckryaml);
}

function configtxyamlgen(data) {
  let configtx;
  configtx = "{"; //HEAD_{
  configtx += "\"Organizations\":["; // Organizations_[
  for (var i = 0; i < data.orgcount; i++) {
    configtx += "{"; //Organizations_{
    configtx += "\"Name\":\"ord-" + data.org[i].name + ".com\","; //Name
    configtx += "\"ID\":\"ord-" + data.org[i].name + "MSP\","; //ID
    configtx += "\"MSPDir\":\"crypto-config/ordererOrganizations/ord-" + data.org[i].name + ".com/msp\","; // MSPDir

    configtx += "\"Policies\":{"; // Policies_{

    configtx += "\"Readers\":{"; // Readers_{
    configtx += "\"Type\":\"Signature\","; // Type
    configtx += "\"Rule\": \"OR('ord-" + data.org[i].name + "MSP.member')\""; // Rule
    configtx += "},"; // Readers_}

    configtx += "\"Writers\":{"; // Writers_{
    configtx += "\"Type\":\"Signature\","; // Type
    configtx += "\"Rule\": \"OR('ord-" + data.org[i].name + "MSP.member')\""; // Rule
    configtx += "},"; // Writers_}

    configtx += "\"Admins\":{"; // Admin_{
    configtx += "\"Type\":\"Signature\","; // Type
    configtx += "\"Rule\": \"OR('ord-" + data.org[i].name + "MSP.admin')\""; // Rule
    configtx += "}"; //Admin_}

    configtx += "}"; // Policies
    configtx += "}"; // Organizations
    configtx += ",";
  }

  for (var i = 0; i < data.orgcount; i++) {
    if (i) {
      configtx += ",";
    }
    configtx += "{\"Name\":\"" + data.org[i].name + "MSP\","; // Name
    configtx += "\"ID\":\"" + data.org[i].name + "MSP\","; // ID
    configtx += "\"MSPDir\":\"crypto-config/ordererOrganizations/ord-" + data.org[i].name + ".com/msp\","; // MSPDir
    configtx += "\"Policies\":{"; // Policies_{

    configtx += "\"Readers\":{"; // Readers_{
    configtx += "\"Type\":\"Signature\","; // Type
    configtx += "\"Rule\": \"OR(\'" + data.org[i].name + "MSP.admin\', \'" + data.org[i].name + "MSP.peer\', \'" + data.org[i].name + "MSP.client\')\""; // Rule
    configtx += "},"; // Readers_}

    configtx += "\"Writers\":{"; // Writers_{
    configtx += "\"Type\":\"Signature\","; // Type
    configtx += "\"Rule\": \"OR(\'" + data.org[i].name + "MSP.admin\', \'" + data.org[i].name + "MSP.client\')\""; // Rule
    configtx += "},"; // Writers_}

    configtx += "\"Admins\": {"; // Admins_{
    configtx += "\"Type\": \"Signature\","; // Type
    configtx += "\"Rule\": \"OR(\'" + data.org[i].name + "MSP.admin\')\""; // Rule
    configtx += "}" // Admins

    configtx += "},"; // Policies_}

    configtx += "\"AnchorPeers\": [{\"Host\": \"" + data.org[i].peer[0].name + "." + data.org[i].name + ".com\",\"Port\": 7051}]"; // AnchorPeers
    configtx += "}"
  }

  configtx += "],"; // Organizations_]

  /******************************************** Capabilities ********************************************/
  configtx += "\"Capabilities\": {"; // Capabilities_{
  configtx += "\"Channel\": {"; // Channel_{
  configtx += "\"V1_4_3\": true,";
  configtx += "\"V1_3\": false,";
  configtx += "\"V1_1\": false";
  configtx += "},"; // Channel_}
  configtx += "\"Orderer\": {"; // Orderer_{
  configtx += "\"V1_4_2\": true,";
  configtx += "\"V1_1\": false";
  configtx += "},"; // Orderer_}
  configtx += "\"Application\": {"; // Application_{
  configtx += "\"V1_4_2\": true,";
  configtx += "\"V1_3\": false,";
  configtx += "\"V1_2\": false,";
  configtx += "\"V1_1\": false";
  configtx += "}"; // Application_}
  configtx += "},"; // Capabilities_}

  /******************************************** Application ********************************************/
  configtx += "\"Application\": {"; // Application_{
  configtx += "\"Organizations\": null,";
  configtx += "\"Policies\": {"; // Policies_{

  configtx += "\"Readers\": {"; // Readers_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"ANY Readers\""; // Rule
  configtx += "}," // Readers_}

  configtx += "\"Writers\": {" // Writers_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"ANY Writers\""; // Rule
  configtx += "},"; // Writers_}

  configtx += "\"Admins\": {"; // Admins_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"MAJORITY Admins\""; // Rule
  configtx += "}"; // Admins_}

  configtx += "},"; // Policies_}

  configtx += "\"Capabilities\": {"; // Capabilities_{
  configtx += "\"V1_4_2\": true,";
  configtx += "\"V1_3\": false,";
  configtx += "\"V1_2\": false,";
  configtx += "\"V1_1\": false";
  configtx += "}"; // Capabilities_}

  configtx += "},"; // Application_}

  /******************************************** Orderer ********************************************/
  configtx += "\"Orderer\": {"; // Orderer_{
  configtx += "\"OrdererType\": \"etcdraft\","; // OrdererType

  configtx += "\"Addresses\": ["; // Addressess_[
  for (var i = 0; i < data.orgcount; i++) {
    if (i) {
      configtx += ",";
    }
    configtx += "\"orderer.ord-" + data.org[i].name + ".com:7050\"";
  }
  configtx += "],"; // Addressess_]

  configtx += "\"BatchTimeout\": \"2s\","; // BatchTimeout
  configtx += "\"BatchSize\": {"; // BatchSize_{
  configtx += "\"MaxMessageCount\": 10,";
  configtx += "\"AbsoluteMaxBytes\": \"99 MB\",";
  configtx += "\"PreferredMaxBytes\": \"512 KB\"";
  configtx += "},"; // BatchSize_}

  configtx += "\"EtcdRaft\": {"; // EtcRaft_{
  configtx += "\"Consenters\": ["; // Consenters_[
  for (var i = 0; i < data.orgcount; i++) {
    if (i) {
      configtx += ",";
    }
    configtx += "{";
    configtx += "\"Host\": \"orderer.ord-" + data.org[i].name + ".com\","
    configtx += "\"Port\": 7050,";
    configtx += "\"ClientTLSCert\": \"crypto-config/ordererOrganizations/ord-" + data.org[i].name + ".com/orderers/orderer.ord-" + data.org[i].name + ".com/tls/server.crt\",";
    configtx += "\"ServerTLSCert\": \"crypto-config/ordererOrganizations/ord-" + data.org[i].name + ".com/orderers/orderer.ord-" + data.org[i].name + ".com/tls/server.crt\"";
    configtx += "}";
  }
  configtx += "]"; // Consenters_]
  configtx += "},"; // EtcRaft_}

  configtx += "\"Organizations\": null,";
  configtx += "\"Policies\": {"; // Policies_{

  configtx += "\"Readers\": {"; // Readers_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"ANY Readers\""; // Rule
  configtx += "}," // Readers_}

  configtx += "\"Writers\": {" // Writers_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"ANY Writers\""; // Rule
  configtx += "},"; // Writers_}

  configtx += "\"Admins\": {"; // Admins_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"MAJORITY Admins\""; // Rule
  configtx += "},"; // Admins_}

  configtx += "\"BlockValidation\": {"; // BlockValidation_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"ANY Writers\""; // Rule
  configtx += "}"; // BlockValidation_}

  configtx += "}"; // Policies_}

  configtx += "}," // Orderer_}

  /******************************************** Channel ********************************************/
  configtx += "\"Channel\": {"; // Channel_{
  configtx += "\"Policies\": {"; // Policies_{

  configtx += "\"Readers\": {"; // Readers_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"ANY Readers\""; // Rule
  configtx += "}," // Readers_}

  configtx += "\"Writers\": {" // Writers_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"ANY Writers\""; // Rule
  configtx += "},"; // Writers_}

  configtx += "\"Admins\": {"; // Admins_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"MAJORITY Admins\""; // Rule
  configtx += "}"; // Admins_}

  configtx += "},"; // Policies_}

  configtx += "\"Capabilities\": {"; // Capabilities_{
  configtx += "\"V1_4_3\": true,";
  configtx += "\"V1_3\": false,";
  configtx += "\"V1_1\": false";
  configtx += "}" // Capabilities_}

  configtx += "},";

  /******************************************** Profiles ********************************************/
  configtx += "\"Profiles\": {"; // Profiles_{
  configtx += "\"testchannel\": {"; // testchannel_{
  configtx += "\"Consortium\": \"TestConsortium\"," // Consortium

  configtx += "\"Policies\": {"; // Policies_{

  configtx += "\"Readers\": {"; // Readers_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"ANY Readers\""; // Rule
  configtx += "}," // Readers_}

  configtx += "\"Writers\": {" // Writers_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"ANY Writers\""; // Rule
  configtx += "},"; // Writers_}

  configtx += "\"Admins\": {"; // Admins_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"MAJORITY Admins\""; // Rule
  configtx += "}"; // Admins_}

  configtx += "},"; // Policies_}

  configtx += "\"Capabilities\": {"; // Capabilities_{
  configtx += "\"V1_4_3\": true,";
  configtx += "\"V1_3\": false,";
  configtx += "\"V1_1\": false";
  configtx += "}," // Capabilities_}

  configtx += "\"Application\": {"; // Application_{
  configtx += "\"Organizations\":["; // Organizations_[
  for (var i = 0; i < data.orgcount; i++) {
    if (i) {
      configtx += ",";
    }
    configtx += "{\"Name\":\"" + data.org[i].name + "MSP\","; // Name
    configtx += "\"ID\":\"" + data.org[i].name + "MSP\","; // ID
    configtx += "\"MSPDir\":\"crypto-config/ordererOrganizations/ord-" + data.org[i].name + ".com/msp\","; // MSPDir
    configtx += "\"Policies\":{"; // Policies_{

    configtx += "\"Readers\":{"; // Readers_{
    configtx += "\"Type\":\"Signature\","; // Type
    configtx += "\"Rule\": \"OR(\'" + data.org[i].name + "MSP.admin\', \'" + data.org[i].name + "MSP.peer\', \'" + data.org[i].name + "MSP.client\')\""; // Rule
    configtx += "},"; // Readers_}

    configtx += "\"Writers\":{"; // Writers_{
    configtx += "\"Type\":\"Signature\","; // Type
    configtx += "\"Rule\": \"OR(\'" + data.org[i].name + "MSP.admin\', \'" + data.org[i].name + "MSP.client\')\""; // Rule
    configtx += "},"; // Writers_}

    configtx += "\"Admins\": {"; // Admins_{
    configtx += "\"Type\": \"Signature\","; // Type
    configtx += "\"Rule\": \"OR(\'" + data.org[i].name + "MSP.admin\')\""; // Rule
    configtx += "}" // Admins

    configtx += "},"; // Policies_}

    configtx += "\"AnchorPeers\": [{\"Host\": \"" + data.org[i].peer[0].name + "." + data.org[i].name + ".com\",\"Port\": 7051}]"; // AnchorPeers
    configtx += "}"
  }

  configtx += "],"; // Organizations_]

  configtx += "\"Policies\": {"; // Policies_{
  configtx += "\"Readers\": {"; // Readers_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"ANY Readers\""; // Rule
  configtx += "}," // Readers_}

  configtx += "\"Writers\": {" // Writers_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"ANY Writers\""; // Rule
  configtx += "},"; // Writers_}

  configtx += "\"Admins\": {"; // Admins_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"MAJORITY Admins\""; // Rule
  configtx += "}"; // Admins_}
  configtx += "},"; // Policies_}

  configtx += "\"Capabilities\": {"; // Capabilities_{
  configtx += "\"V1_4_2\": true,";
  configtx += "\"V1_3\": false,";
  configtx += "\"V1_2\": false,";
  configtx += "\"V1_1\": false";
  configtx += "}" // Capabilities_}

  configtx += "}"; // Application_}
  configtx += "},"; // testchannel_}

  configtx += "\"MultiNodeEtcdRaft\": {" // MultiNodeEtcdRaft_{

  configtx += "\"Policies\": {"; // Policies_{
  configtx += "\"Readers\": {"; // Readers_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"ANY Readers\""; // Rule
  configtx += "}," // Readers_}

  configtx += "\"Writers\": {" // Writers_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"ANY Writers\""; // Rule
  configtx += "},"; // Writers_}

  configtx += "\"Admins\": {"; // Admins_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"MAJORITY Admins\""; // Rule
  configtx += "}"; // Admins_}
  configtx += "},"; // Policies_}

  configtx += "\"Capabilities\": {"; // Capabilities_{
  configtx += "\"V1_4_3\": true,";
  configtx += "\"V1_3\": false,";
  configtx += "\"V1_1\": false";
  configtx += "}," // Capabilities_}

  configtx += "\"Orderer\": {"; // Orderer_{

  configtx += "\"OrdererType\": \"etcdraft\","; // OrdererType

  configtx += "\"Addresses\": ["; // Addressess_[
  for (var i = 0; i < data.orgcount; i++) {
    if (i) {
      configtx += ",";
    }
    configtx += "\"orderer.ord-" + data.org[i].name + ".com:7050\"";
  }
  configtx += "],"; // Addressess_]

  configtx += "\"BatchTimeout\": \"2s\","; // BatchTimeout
  configtx += "\"BatchSize\": {"; // BatchSize_{
  configtx += "\"MaxMessageCount\": 10,";
  configtx += "\"AbsoluteMaxBytes\": \"99 MB\",";
  configtx += "\"PreferredMaxBytes\": \"512 KB\"";
  configtx += "},"; // BatchSize_}

  configtx += "\"EtcdRaft\": {"; // EtcRaft_{
  configtx += "\"Consenters\": ["; // Consenters_[
  for (var i = 0; i < data.orgcount; i++) {
    if (i) {
      configtx += ",";
    }
    configtx += "{";
    configtx += "\"Host\": \"orderer.ord-" + data.org[i].name + ".com\","
    configtx += "\"Port\": 7050,";
    configtx += "\"ClientTLSCert\": \"crypto-config/ordererOrganizations/ord-" + data.org[i].name + ".com/orderers/orderer.ord-" + data.org[i].name + ".com/tls/server.crt\",";
    configtx += "\"ServerTLSCert\": \"crypto-config/ordererOrganizations/ord-" + data.org[i].name + ".com/orderers/orderer.ord-" + data.org[i].name + ".com/tls/server.crt\"";
    configtx += "}";
  }
  configtx += "]"; // Consenters_]
  configtx += "},"; // EtcRaft_}

  configtx += "\"Organizations\":["; // Organizations_[
  for (var i = 0; i < data.orgcount; i++) {
    if (i) {
      configtx += ",";
    }
    configtx += "{"; //Organizations_{
    configtx += "\"Name\":\"ord-" + data.org[i].name + ".com\","; //Name
    configtx += "\"ID\":\"ord-" + data.org[i].name + "MSP\","; //ID
    configtx += "\"MSPDir\":\"crypto-config/ordererOrganizations/ord-" + data.org[i].name + ".com/msp\","; // MSPDir

    configtx += "\"Policies\":{"; // Policies_{

    configtx += "\"Readers\":{"; // Readers_{
    configtx += "\"Type\":\"Signature\","; // Type
    configtx += "\"Rule\": \"OR('ord-" + data.org[i].name + "MSP.member')\""; // Rule
    configtx += "},"; // Readers_}

    configtx += "\"Writers\":{"; // Writers_{
    configtx += "\"Type\":\"Signature\","; // Type
    configtx += "\"Rule\": \"OR('ord-" + data.org[i].name + "MSP.member')\""; // Rule
    configtx += "},"; // Writers_}

    configtx += "\"Admins\":{"; // Admin_{
    configtx += "\"Type\":\"Signature\","; // Type
    configtx += "\"Rule\": \"OR('ord-" + data.org[i].name + "MSP.admin')\""; // Rule
    configtx += "}"; //Admin_}

    configtx += "}"; // Policies
    configtx += "}"; // Organizations
    //configtx += ",";
  }
  configtx += "],"; // Organizations_]

  configtx += "\"Policies\": {"; // Policies_{

  configtx += "\"Readers\": {"; // Readers_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"ANY Readers\""; // Rule
  configtx += "}," // Readers_}

  configtx += "\"Writers\": {" // Writers_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"ANY Writers\""; // Rule
  configtx += "},"; // Writers_}

  configtx += "\"Admins\": {"; // Admins_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"MAJORITY Admins\""; // Rule
  configtx += "},"; // Admins_}

  configtx += "\"BlockValidation\": {"; // BlockValidation_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"ANY Writers\""; // Rule
  configtx += "}"; // BlockValidation_}

  configtx += "},"; // Policies_}

  configtx += "\"Capabilities\": {";
  configtx += "\"V1_4_2\": true,";
  configtx += "\"V1_1\": false";
  configtx += "}";

  configtx += "},"; // Orderer_}

  configtx += "\"Application\": {"; // Application_{
  configtx += "\"Organizations\":["; // Organizations_[
  for (var i = 0; i < data.orgcount; i++) {
    if (i) {
      configtx += ","
    }
    configtx += "{"; //Organizations_{
    configtx += "\"Name\":\"ord-" + data.org[i].name + ".com\","; //Name
    configtx += "\"ID\":\"ord-" + data.org[i].name + "MSP\","; //ID
    configtx += "\"MSPDir\":\"crypto-config/ordererOrganizations/ord-" + data.org[i].name + ".com/msp\","; // MSPDir

    configtx += "\"Policies\":{"; // Policies_{

    configtx += "\"Readers\":{"; // Readers_{
    configtx += "\"Type\":\"Signature\","; // Type
    configtx += "\"Rule\": \"OR('ord-" + data.org[i].name + "MSP.member')\""; // Rule
    configtx += "},"; // Readers_}

    configtx += "\"Writers\":{"; // Writers_{
    configtx += "\"Type\":\"Signature\","; // Type
    configtx += "\"Rule\": \"OR('ord-" + data.org[i].name + "MSP.member')\""; // Rule
    configtx += "},"; // Writers_}

    configtx += "\"Admins\":{"; // Admin_{
    configtx += "\"Type\":\"Signature\","; // Type
    configtx += "\"Rule\": \"OR('ord-" + data.org[i].name + "MSP.admin')\""; // Rule
    configtx += "}"; //Admin_}

    configtx += "}"; // Policies
    configtx += "}"; // Organizations
    //configtx += ",";
  }
  configtx += "],\"Policies\": {"; // Policies_{

  configtx += "\"Readers\": {"; // Readers_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"ANY Readers\""; // Rule
  configtx += "}," // Readers_}

  configtx += "\"Writers\": {" // Writers_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"ANY Writers\""; // Rule
  configtx += "},"; // Writers_}

  configtx += "\"Admins\": {"; // Admins_{
  configtx += "\"Type\": \"ImplicitMeta\","; // Type
  configtx += "\"Rule\": \"MAJORITY Admins\""; // Rule
  configtx += "}"; // Admins_}

  configtx += "},"; // Policies_}

  configtx += "\"Capabilities\": {"; // Capabilities_{
  configtx += "\"V1_4_2\": true,";
  configtx += "\"V1_3\": false,";
  configtx += "\"V1_2\": false,";
  configtx += "\"V1_1\": false";
  configtx += "}"; // Capabilities_}
  configtx += "},"; //Application_}

  configtx += "\"Consortiums\": {"; // Consortiums_{
  configtx += "\"TestConsortium\": {"; // TestConsortium_{
  configtx += "\"Organizations\":["; // Organizations_[
  for (var i = 0; i < data.orgcount; i++) {
    if (i) {
      configtx += ",";
    }
    configtx += "{\"Name\":\"" + data.org[i].name + "MSP\","; // Name
    configtx += "\"ID\":\"" + data.org[i].name + "MSP\","; // ID
    configtx += "\"MSPDir\":\"crypto-config/ordererOrganizations/ord-" + data.org[i].name + ".com/msp\","; // MSPDir
    configtx += "\"Policies\":{"; // Policies_{

    configtx += "\"Readers\":{"; // Readers_{
    configtx += "\"Type\":\"Signature\","; // Type
    configtx += "\"Rule\": \"OR(\'" + data.org[i].name + "MSP.admin\', \'" + data.org[i].name + "MSP.peer\', \'" + data.org[i].name + "MSP.client\')\""; // Rule
    configtx += "},"; // Readers_}

    configtx += "\"Writers\":{"; // Writers_{
    configtx += "\"Type\":\"Signature\","; // Type
    configtx += "\"Rule\": \"OR(\'" + data.org[i].name + "MSP.admin\', \'" + data.org[i].name + "MSP.client\')\""; // Rule
    configtx += "},"; // Writers_}

    configtx += "\"Admins\": {"; // Admins_{
    configtx += "\"Type\": \"Signature\","; // Type
    configtx += "\"Rule\": \"OR(\'" + data.org[i].name + "MSP.admin\')\""; // Rule
    configtx += "}" // Admins

    configtx += "},"; // Policies_}

    configtx += "\"AnchorPeers\": [{\"Host\": \"" + data.org[i].peer[0].name + "." + data.org[i].name + ".com\",\"Port\": 7051}]"; // AnchorPeers
    configtx += "}"
  }

  configtx += "]"; // Organizations_]
  configtx += "}"; // TestConsortium_}
  configtx += "}"; // Consortiums_}
  configtx += "}"; // MultiNodeEtcdRaft_}
  configtx += "}" // Profiles_}
  configtx += "}" // HEAD_}
  /******************************************** Finish configtx ********************************************/
  //console.log(configtx);
  const configtxjson = JSON.parse(configtx);
  const configtxyaml = YAML.stringify(configtxjson);
  return (configtxyaml);
}

router.get('/:id/' + secretkey, async function(req, res) {
  con.query('select data from pending where id=?', req.params.id, async function(err, results) {
    if (results.length) {
      var data = results[0].data;
      data = await JSON.parse(data);
      for (var i = 0; i < data.orgcount; i++) {
        dkyaml[i] = await dckryamlgen(data, i);
        // dckryaml=await dckryamlgen(data);
      }
      configtxyaml = await configtxyamlgen(data);
      cryptoyaml = await cryptoyamlgen(data);
      const cryptodir = await randomstring.generate(6);
      cmd.run('mkdir files/temp/' + cryptodir);
      await write.sync('files/temp/' + cryptodir + '/crypto-config.yaml', cryptoyaml);

      var network={id:req.params.id, data:[]};

      var extra_hosts='    extra_hosts:\n';
      for(var i = 0; i < data.orgcount; i++){
        var { networkid, PrivateIpAddress } = await aws.setupNetwork();
        await network.data.push({Ip:PrivateIpAddress,networkid:networkid});
        extra_hosts+='      - "' + data.org[i].name + '.com:'+network.data[i].Ip + '"';
      }


      cmd.get('export PATH="$PATH:/opt/gopath/src/github.com/hyperledger/fabric/bin";cryptogen generate --config=./files/temp/' + cryptodir + '/crypto-config.yaml --output="./files/temp/' + cryptodir + '/crypto-config"', async function(err, dat, stderr) {
        for (var i = 0; i < data.orgcount; i++) {
          var zip = new AdmZip();
          await zip.addLocalFolder('files/temp/' + cryptodir + '/crypto-config/ordererOrganizations/ord-' + data.org[i].name + '.com', 'crypto-config/ordererOrganizations/ord-' + data.org[i].name + '.com');
          await zip.addLocalFolder('files/temp/' + cryptodir + '/crypto-config/peerOrganizations/' + data.org[i].name + '.com', 'crypto-config/peerOrganizations/' + data.org[i].name + '.com');
          await zip.addFile("docker-compose.yaml", Buffer.alloc(dkyaml[i].length, dkyaml[i]), "");
          // zip.addFile("docker-compose.yaml", Buffer.alloc(dckryaml.length, dckryaml), "");
          await zip.addFile("configtx.yaml", Buffer.alloc(configtxyaml.length, configtxyaml), "");


          const rndtmpname = await randomstring.generate(6);
          await fs.copyFileSync('files/node-base.yaml', 'files/temp/node-base.yaml')
          await insertLine('files/temp/node-base.yaml').content(extra_hosts).at(26)
          await zip.addLocalFile("files/temp/node-base.yaml");

          var ca_keys = 'export testnet_ca_' + data.org[i].name + '_com_PRIVATE_KEY=$(cd ./crypto-config/peerOrganizations/' + data.org[i].name + '.com/ca && ls *_sk)\n';

          const rnddownloadname = await randomstring.generate(64);
          network.data.file=rnddownloadname + '.zip';
          await fs.copyFileSync('files/testnet.sh', 'files/temp/start.sh')
          await insertLine('files/temp/start.sh').content(ca_keys).at(19)
          await zip.addLocalFile('files/temp/start.sh');
          await zip.writeZip('public/download/' + rnddownloadname + '.zip');

        }


        for (var i = 0; i < data.orgcount; i++) {
          con.query('select username, data from users where username=?', data.org[i].name, async function(err, results) {
            var it = 0;
            var userdata = JSON.parse(results[0].data);
            for (var i = 0; i < userdata.pending.length; i++) {
              if (userdata.pending[i].id == req.params.id) {
                it = i;
              }
            }
            userdata.pending.splice(it, 1);
            if (!userdata.finished) {
              userdata.finished = [];
            }
            userdata.finished.push({
              id: req.params.id
            });
            userdata = await JSON.stringify(userdata);
            con.query('update users set data=? where username=?', [userdata, results[0].username]);
          });
        }

        for (var i = 0; i < data.orgcount; i++) {
          network.data[i].InstanceId = await aws.launchInstanceOfNetwork(network.data[i].networkid);
        }

        network=JSON.stringify(network);
        con.query('insert into networks set id=?, data=?', [req.params.id, network]);
        con.query('delete from pending where id=?', req.params.id);
	res.send("Success")
      });
    } else {
      res.send('Illegal Request')
    }
  });
});
module.exports = router;
