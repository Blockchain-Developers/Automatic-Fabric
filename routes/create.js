var express = require('express');
var router = express.Router();
var AdmZip = require('adm-zip');
var randomstring = require("randomstring");
var CronJob = require('cron').CronJob;
const fs = require('fs');
const fsExtra = require('fs-extra')
const YAML = require('json-to-pretty-yaml');
const insertLine = require('insert-line')
const session = require('express-session');

router.use(session(
{
	secret: 'sEreteerfUU343kkkdfjjdf',
	name: 'data',
	resave: true,
	saveUninitialized: true,
	cookie:
	{
		maxAge: 1000 * 60 * 60
	},
	rolling: true,
}));

var cleartemp = new CronJob('0 */10 * * * *', function() {
  fsExtra.emptyDir('files/temp')
}, null, true);
cleartemp.start();

function cryptoyamlgen(data){
  let crypto;
  crypto="{\"OrdererOrgs\":[";
  for(var i=0;i<data.orgcount;i++){
    if(i!=0){crypto+=",";}
    crypto=crypto+"{\"Name\":\"ord-"+data.org[i].name+"\", \"Domain\":\"ord-"+data.org[i].name+".com\", \"EnableNodeOUs\": true, \"Specs\":[{\"Hostname\": \"orderer\"}]}";
  }
  crypto=crypto+"], \"PeerOrgs\":[";
  for(var i=0;i<data.orgcount;i++){
    if(i!=0){crypto+=",";}
    crypto=crypto+"{\"Name\":\""+data.org[i].name+"\", \"Domain\":\""+data.org[i].name+".com\", \"EnableNodeOUs\": true, \"Specs\":[";
    crypto=crypto+"{\"Hostname\":\""+data.org[i].peer[0].name+"\"}";
    for(var j=1;j<data.org[i].peercount;j++){
      crypto=crypto+",{\"Hostname\":\""+data.org[i].peer[j].name+"\"}";
    }
    crypto=crypto+"]}";
  }
  crypto=crypto+"]}";
  //console.log(crypto);
  const cryptojson=JSON.parse(crypto);
  const cryptoyaml = YAML.stringify(cryptojson);
  return(cryptoyaml);
}

function dckryamlgen(data){
  let dckr;
  dckr = "{\"version\": \"2\",";// HEAD_{
  dckr += "\"volumes\": {";// volumes_{
  for (var i = 0; i < data.orgcount; i++) { // peers
    for (var j = 0; j < data.org[i].peercount; j++) {
      dckr += "\"" + data.org[i].peer[j].name +"." + data.org[i].name + ".com\": null,";
    }
  }
  for (var i = 0; i < data.orgcount; i++) { // orderers
    if (i) {
      dckr += ",";
    }
    dckr += "\"orderer." + data.org[i].name + "ord.com\": null";
  }
  dckr += "}," // volumes_}

  dckr += "\"networks\":{\"testnet\": null},"; //networks

  dckr += "\"services\":{";// services_{
  var port_num = 7;
  for (var i = 0; i < data.orgcount; i++) { // ORDERER.ORGORD.COM
    dckr += "\"orderer.ord-" + data.org[i].name + ".com\":{"; // orderer.ord_{
    dckr += "\"container_name\":\"orderer.ord-"+data.org[i].name+".com\","; // container_name

    dckr += "\"extends\":{"; // extends_{
    dckr += "\"file\":\"node-base.yaml\",";
    dckr += "\"service\": \"orderer-base\"}," // extends_}

    dckr += "\"networks\":[\"testnet\"],"; // networks
    dckr += "\"environment\":["; // environment_{
    dckr += "\"ORDERER_GENERAL_LOCALMSPID=" + data.org[i].name + "OrdMSP\"],";// environment_}
    dckr += "\"volumes\":["; // volumes_{
    dckr += "\"./channel-artifacts/genesis.block:/var/hyperledger/orderer/orderer.genesis.block\",";
    dckr += "\"./crypto-config/ordererOrganizations/ord-" + data.org[i].name + ".com/orderers/orderer.ord-" + data.org[i].name + ".com/msp:/var/hyperledger/orderer/msp\",";
    dckr += "\"./crypto-config/ordererOrganizations/ord-" + data.org[i].name + ".com/orderers/orderer.ord-" + data.org[i].name + ".com/tls/:/var/hyperledger/orderer/tls\",";
    dckr += "\"orderer." + data.org[i].name + "ord.com:/var/hyperledger/production/orderer\"],"; // volumes_}
    dckr += "\"ports\": [\"" + (port_num+i).toString() + "050:7050\"]"; // ports
    dckr += "},"; //orderer.ord_}
  }
  var peer_num = 7;
  for (var i = 0; i < data.orgcount; i++) { // PEER.ORG.COM
    for (var j = 0; j < data.org[i].peercount; j++) {
      dckr += "\"" + data.org[i].peer[j].name + "." + data.org[i].name + ".com\": {"; // peer.org.com_{
      dckr += "\"container_name\": \"" + data.org[i].peer[j].name + "." + data.org[i].name + ".com\","; // container_name

      dckr += "\"extends\": {"; // extends_{
      dckr += "\"file\": \"node-base.yaml\",";
      dckr += "\"service\": \"peer-base\"";
      dckr += "},"; // extends_}

      dckr += "\"networks\": [\"testnet\"],"; // networks

      dckr += "\"environment\": ["; // environment_[
      dckr += "\"CORE_PEER_ID=" + data.org[i].peer[j].name + "." + data.org[i].name + ".com\",";
      dckr += "\"CORE_PEER_ADDRESS=" + data.org[i].peer[j].name + "." + data.org[i].name + ".com:" + (port_num + i).toString() + "051\",";
      dckr += "\"CORE_PEER_LISTENADDRESS=0.0.0.0:" + (port_num + i).toString() + "051\",";
      dckr += "\"CORE_PEER_CHAINCODEADDRESS=" + data.org[i].peer[j].name + "." + data.org[i].name + ".com:" + (port_num + i).toString() + "052\",";
      dckr += "\"CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:" + (port_num + i).toString() + "052\",";
      dckr += "\"CORE_PEER_GOSSIP_BOOTSTRAP=" + data.org[i].peer[j].name + "." + data.org[i].name + ".com:" + (port_num + i).toString() + "051\",";
      if (!j) {
        dckr += "\"CORE_PEER_GOSSIP_EXTERNALENDPOINT=" + data.org[i].peer[j].name + "." + data.org[i].name + ".com:" + (port_num + i).toString() + "051\",";
      }
      dckr += "\"CORE_PEER_LOCALMSPID=" + data.org[i].name + "MSP\"";
      dckr += "],"; // environment_]

      dckr += "\"volumes\": ["; // volumes_[
      dckr += "\"/var/run/:/host/var/run/\",";
      dckr += "\"./crypto-config/peerOrganizations/" + data.org[i].name + ".com/peers/" + data.org[i].peer[j].name + "." + data.org[i].name + ".com/msp:/etc/hyperledger/fabric/msp\",";
      dckr += "\"./crypto-config/peerOrganizations/" + data.org[i].name + ".com/peers/" + data.org[i].peer[j].name + "." + data.org[i].name + ".com/tls:/etc/hyperledger/fabric/tls\",";
      dckr += "\"" + data.org[i].peer[j].name + "." + data.org[i].name + ".com:/var/hyperledger/production\"";
      dckr += "],"; // volumes_]
      dckr += "\"ports\": [\"" + (peer_num ++).toString() + "051:7051\"]";

      dckr += "},"; // peer.org.com_}
    }
  }
  var ca_num = 7;
  for (var i = 0; i < data.orgcount; i++) { // CA
    if (i) {
      dckr += ",";
    }
    dckr += "\"" + "ca." + data.org[i].name + ".com" + "\": {"; // ca_{
    dckr += "\"image\": \"hyperledger/fabric-ca:$IMAGE_TAG\",";
    dckr += "\"dns_search\": \".\",";
    dckr += "\"environment\": ["; // environment_[
    dckr += "\"GODEBUG=netdns=go\",";
    dckr += "\"FABRIC_CA_HOME=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/" + data.org[i].name + ".com/ca\",";
    dckr += "\"FABRIC_CA_SERVER_CA_NAME=ca-" + data.org[i].name + "\",";
    dckr += "\"FABRIC_CA_SERVER_TLS_ENABLED=true\",";
    dckr += "\"FABRIC_CA_SERVER_TLS_CERTFILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/" + data.org[i].name + ".com/ca/ca." + data.org[i].name + ".com-cert.pem\",";
    dckr += "\"FABRIC_CA_SERVER_TLS_KEYFILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/" + data.org[i].name + ".com/ca/${testnet_"+"ca_"+data.org[i].name+"_com"+"_PRIVATE_KEY}\",";
    dckr += "\"FABRIC_CA_SERVER_PORT=" + (ca_num + i).toString() + "054\"";
    dckr += "],"; // environment_]
    dckr += "\"ports\": [\"" + (ca_num + i).toString() + "054:7054\"],"; // ports

    dckr += "\"command\": \"sh -c 'fabric-ca-server start --ca.certfile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/" + data.org[i].name + ".com/ca/ca." + data.org[i].name + ".com-cert.pem --ca.keyfile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/" + data.org[i].name + ".com/ca/${testnet_" + "ca." + data.org[i].name + ".com" + "_PRIVATE_KEY} -b admin:adminpw -d'\","; // command

    dckr += "\"volumes\": ["; // volumes_[
    dckr += "\"./crypto-config/peerOrganizations/" + data.org[i].name + ".com/ca/:/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/" + data.org[i].name + ".com/ca\""
    dckr += "],"; // volumes_]

    dckr += "\"container_name\": \"ca_" + data.org[i].name + "\","; // container_name
    dckr += "\"networks\": [\"testnet\"]"; // networks
    dckr += "}";
  }
  dckr += "}" // services_}
  dckr += "}" // HEAD_}
  //console.log(dckr);
  const dckrjson = JSON.parse(dckr);
  const dckryaml = YAML.stringify(dckrjson);
  return(dckryaml);
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
    if(i) {
      configtx += ",";
    }
    configtx += "{\"Name\":\"" + data.org[i].name + "MSP\","; // Name
    configtx += "\"ID\":\"" + data.org[i].name +"MSP\","; // ID
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
    if(i) {
      configtx += ",";
    }
    configtx += "{\"Name\":\"" + data.org[i].name + "MSP\","; // Name
    configtx += "\"ID\":\"" + data.org[i].name +"MSP\","; // ID
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
    if(i){
        configtx+=",";
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
    if(i){
        configtx+=","
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
    if(i) {
      configtx += ",";
    }
    configtx += "{\"Name\":\"" + data.org[i].name + "MSP\","; // Name
    configtx += "\"ID\":\"" + data.org[i].name +"MSP\","; // ID
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
  const configtxjson = JSON.parse(
    configtx);
  const configtxyaml = YAML.stringify(
    configtxjson);
  return (configtxyaml);
}


//░█████╗░██╗░░░██╗████████╗░█████╗░███╗░░░███╗░█████╗░████████╗██╗░█████╗░
//██╔══██╗██║░░░██║╚══██╔══╝██╔══██╗████╗░████║██╔══██╗╚══██╔══╝██║██╔══██╗
//███████║██║░░░██║░░░██║░░░██║░░██║██╔████╔██║███████║░░░██║░░░██║██║░░╚═╝
//██╔══██║██║░░░██║░░░██║░░░██║░░██║██║╚██╔╝██║██╔══██║░░░██║░░░██║██║░░██╗
//██║░░██║╚██████╔╝░░░██║░░░╚█████╔╝██║░╚═╝░██║██║░░██║░░░██║░░░██║╚█████╔╝
//╚═╝░░╚═╝░╚═════╝░░░░╚═╝░░░░╚════╝░╚═╝░░░░░╚═╝╚═╝░░╚═╝░░░╚═╝░░░╚═╝░╚════╝░
//
//░░░░░░░░░░░░    ███████╗░█████╗░██████╗░██████╗░██╗░█████╗░    ░░░░░░░░░░░░
//░░░░░░░░░░░░    ██╔════╝██╔══██╗██╔══██╗██╔══██╗██║██╔══██╗    ░░░░░░░░░░░░
//█████╗█████╗    █████╗░░███████║██████╦╝██████╔╝██║██║░░╚═╝    █████╗█████╗
//╚════╝╚════╝    ██╔══╝░░██╔══██║██╔══██╗██╔══██╗██║██║░░██╗    ╚════╝╚════╝
//░░░░░░░░░░░░    ██║░░░░░██║░░██║██████╦╝██║░░██║██║╚█████╔╝    ░░░░░░░░░░░░
//░░░░░░░░░░░░    ╚═╝░░░░░╚═╝░░╚═╝╚═════╝░╚═╝░░╚═╝╚═╝░╚════╝░    ░░░░░░░░░░░░

router.post('/finalize', async function(req, res) {
  const data=await JSON.parse(req.body.data);
  cryptoyaml=await cryptoyamlgen(data);
  dckryaml=await dckryamlgen(data);
  configtxyaml=await configtxyamlgen(data);

  var zip=new AdmZip();
  zip.addFile("crypto-config.yaml", Buffer.alloc(cryptoyaml.length, cryptoyaml), "");
  zip.addFile("docker-compose.yaml", Buffer.alloc(dckryaml.length, dckryaml), "");
  zip.addFile("configtx.yaml", Buffer.alloc(configtxyaml.length, configtxyaml), "");
  zip.addLocalFile("files/node-base.yaml");

  var ca_keys='';
  for (var i = 0; i < data.orgcount; i++) {
    ca_keys+='export testnet_ca_'+data.org[i].name+'_com_PRIVATE_KEY=$(cd ./crypto-config/peerOrganizations/'+data.org[i].name+'.com/ca && ls *_sk)\n'
  }
  const rndname=await randomstring.generate(6);
  fs.copyFile('files/testnet.sh', 'files/temp/'+rndname+'.sh', (err) => {
    insertLine('files/temp/'+rndname+'.sh').content(ca_keys).at(19).then(function(err) {
     zip.addLocalFile('files/temp/'+rndname+'.sh');
      zip.writeZip('public/download/'+'config-'+rndname+'.zip');
      //res.type('document');
      res.redirect('/download/'+'config-'+rndname+'.zip');
    });
  });
});
router.get('/', function(req, res, next) {
	res.render('numoforgs')
});
router.post('/', function(req, res, next){
	req.session.data={};
	req.session.data.org=[];
	req.session.data.orgcount=req.body.orgcount;
	res.redirect('/create/setorg/0')
});
router.get('/setorg/finished', function(req, res, next){
	res.render('setorgfinished', {data:req.session.data})
});
router.get('/setorg/:id', function(req, res, next){
	var id=req.params.id;
	var finished=true;
	for(var i=0;i<req.session.data.orgcount;i++){
		if(!req.session.data.org[i]){
			finished=false;
			break;
		}
	}
	if(req.session.data.org[id]){
		res.render('setorg', {data:req.session.data, id:id, orgname:req.session.data.org[id].name, peercount:req.session.data.org[id].peercount, ordererport:req.session.data.org[id].orderer.port, caport:req.session.data.org[id].ca.port, finished:finished})
	}
	else{
		res.render('setorg', {data:req.session.data, id:id, finished:finished})
	}
});
router.post('/setorg/:id', function(req, res, next){
	var id=req.params.id;
	req.session.data.org[id]={};
	req.session.data.org[id].name=req.body.orgname;
	req.session.data.org[id].peercount=req.body.peercount;
	req.session.data.org[id].orderer={};
	req.session.data.org[id].orderer.port=req.body.ordererport;
	req.session.data.org[id].ca={};
	req.session.data.org[id].ca.port=req.body.caport;
	req.session.data.org[id].peer=[];
	if(id==req.session.data.orgcount-1){
		res.redirect('/create/setorg/finished')
	}
	else{
		id=id*1+1;
		res.redirect('/create/setorg/'+id)
	}

});
router.post('/setpeer/initialize', function(req, res, next){
	res.redirect('/create/setpeer/0')

});

router.get('/setpeer/finished', async function(req, res, next){
	var datastring= await JSON.stringify(req.session.data)
	res.render('setpeerfinished', {data: req.session.data, datastring:datastring})
});
router.get('/setpeer/:id', function(req, res, next){
	var id=req.params.id;
	var finished=true;
	for(var i=0;i<req.session.data.orgcount;i++){
		if(req.session.data.org[i].peer.length!=req.session.data.org[i].peercount){
			finished=false;
			break;
		}
	}
	if(!req.session.data.org[id].peer.length){
		for(var i=0;i<req.session.data.org[id].peercount;i++){
			req.session.data.org[id].peer[i]={};
		}
	}
	if(req.session.data.org[id]){
		res.render('setpeer', {data:req.session.data, id:id, finished:finished})
	}
	else{
		res.render('setpeer', {data:req.session.data, id:id, finished:finished})
	}
});

router.post('/setpeer/:id', function(req, res, next){
	var id=req.params.id;
	for(var i=0;i<req.session.data.org[id].peercount;i++){
		req.session.data.org[id].peer[i].name=eval('req.body.peer'+i+'name');
		req.session.data.org[id].peer[i].port=eval('req.body.peer'+i+'port');
	}

	if(id==req.session.data.orgcount-1){
		res.redirect('/create/setpeer/finished')
	}
	else{
		id=id*1+1;
		res.redirect('/create/setpeer/'+id)
	}

});
module.exports = router;
