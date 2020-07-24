var express = require("express");
var router = express.Router();
var AdmZip = require("adm-zip");
var randomstring = require("randomstring");
//var CronJob = require("cron").CronJob;
const fs = require("fs");
const fsExtra = require("fs-extra");
const YAML = require("js-yaml");
const insertLine = require("insert-line");
const write = require("write");
var cmd = require("node-cmd");
const aws = require("./aws");
const client_config = require("./client_config.js");
const { promisify } = require("util");
const axios = require("axios");
const proxykey =
    "hi52MOxnCxJ1llf3krd2NKeqQFdXl0rouuKEzYx7NuKCu7dLyVGkTgqsQFrHtMuRmtvtydM9er57cQy65O1Tqr2fHF8cn5JlO4SsOglzfnlitXbNViWAP7kLOPJozM06Us5gRt2bqQiUYLZJPfPBAhWHRW7A1EJP";

const mysql = require("mysql");
const con = mysql.createConnection({
    host: "localhost",
    user: "nodejs",
    password: "nodejspassword",
    database: "users",
    multipleStatements: true,
});
const queryAsync = promisify(con.query).bind(con);
const cmdgetAsync = promisify(cmd.get).bind(cmd);

var dkyaml = [];
var port_num = 7;
var peer_num = 7;
var ca_num = 7;

function cryptoyamlgen(data) {
    let crypto;
    crypto = '{"OrdererOrgs":[';
    for (var i = 0; i < data.orgcount; i++) {
        if (i != 0) {
            crypto += ",";
        }
        crypto =
            crypto +
            '{"Name":"ord-' +
            data.org[i].name +
            '", "Domain":"ord-' +
            data.org[i].name +
            '.com", "EnableNodeOUs": true, "Specs":[{"Hostname": "orderer"}]}';
    }
    crypto = crypto + '], "PeerOrgs":[';
    for (var i = 0; i < data.orgcount; i++) {
        if (i != 0) {
            crypto += ",";
        }
        crypto =
            crypto +
            '{"Name":"' +
            data.org[i].name +
            '", "Domain":"' +
            data.org[i].name +
            '.com", "EnableNodeOUs": true, "Specs":[';
        crypto = crypto + '{"Hostname":"' + data.org[i].peer[0].name + '"}';
        for (var j = 1; j < data.org[i].peercount; j++) {
            crypto =
                crypto + ',{"Hostname":"' + data.org[i].peer[j].name + '"}';
        }
        crypto = crypto + "]}";
    }
    crypto = crypto + "]}";
    // console.log(crypto);
    const cryptojson = JSON.parse(crypto);
    const cryptoyaml = YAML.safeDump(cryptojson);
    return cryptoyaml;
}
function dckryamlgen(data, orgnumber) {
    let Org = data.org[orgnumber];
    let dckr = {
        version: "2",
        volumes: Object.assign(
            {},
            ...Org.peer.map((peer) => ({
                [`${peer.name}.${Org.name}.com`]: null,
            })),
            { [`orderer.ord-${Org.name}.com`]: null }
        ),
        networks: { test: null },
        services: {
            [`ca.${Org.name}.com`]: {
                image: "hyperledger/fabric-ca:1.4.7",
                environment: [
                    "FABRIC_CA_HOME=/etc/hyperledger/fabric-ca-server",
                    `FABRIC_CA_SERVER_CA_NAME=ca-${Org.name}`,
                    "FABRIC_CA_SERVER_TLS_ENABLED=true",
                    `FABRIC_CA_SERVER_TLS_CERTFILE=/etc/hyperledger/fabric-ca-server-config/ca.org1.${Org.name}.com-cert.pem`,
                    "FABRIC_CA_SERVER_PORT=7054",
                ],
                ports: [`7054:${Org.ca.port}`],
                command: "sh -c 'fabric-ca-server start -b admin:adminpw -d'",
                volumes: [
                    `../organizations/fabric-ca/${Org.name}:/etc/hyperledger/fabric-ca-server`,
                ],
                container_name: `ca_${Org.name}`,
                networks: ["test"],
            },
            [`orderer.ord-${Org.name}.com`]: {
                extends: {
                    file: "base/node-base.yaml",
                    service: "orderer-base",
                },
                environment: ["ORDERER_GENERAL_LISTENPORT=7050"],
                container_name: `orderer.ord-${Org.name}.com`,
                networks: ["test"],
                volumes: [
                    "./channel-artifacts/genesis.block:/var/hyperledger/orderer/orderer.genesis.block",
                    `./crypto-config/ordererOrganizations/example.com/orderers/orderer.ord-${Org.name}.com/msp:/var/hyperledger/orderer/msp`,
                    `./crypto-config/ordererOrganizations/example.com/orderers/orderer.ord-${Org.name}.com/tls/:/var/hyperledger/orderer/tls`,
                    `orderer.ord-${Org.name}.com:/var/hyperledger/production/orderer`,
                ],
                ports: [`7050:${Org.orderer.port}`],
            },
        },
    };
    Object.assign(
        dckr.services,
        ...Org.peer.map((peer) => ({
            [`${peer.name}.${Org.name}.com`]: {
                container_name: `${peer.name}.${Org.name}.com`,
                extends: {
                    file: "base/node-base.yaml",
                    service: "peer-base",
                },
                environment: [
                    `CORE_PEER_ID=${peer.name}.${Org.name}.com`,
                    `CORE_PEER_ADDRESS=${peer.name}.${Org.name}.com:7051`,
                    `CORE_PEER_LISTENADDRESS=0.0.0.0:7051`,
                    `CORE_PEER_CHAINCODEADDRESS=${peer.name}.${Org.name}.com:7052`,
                    `CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:7052`,
                    `CORE_PEER_GOSSIP_EXTERNALENDPOINT=${peer.name}.${Org.name}.com:7051`,
                    `CORE_PEER_GOSSIP_BOOTSTRAP=${peer.name}.${Org.name}.com:7051`,
                    `CORE_PEER_LOCALMSPID=Org1MSP`,
                ],
                volumes: [
                    "/var/run/:/host/var/run",
                    `./crypto-config/peerOrganizations/${Org.name}.com/peers/${peer.name}.${Org.name}.com/msp:/etc/hyperledger/fabric/msp`,
                    `./crypto-config/peerOrganizations/${Org.name}.com/peers/${peer.name}.${Org.name}.com/tls:/etc/hyperledger/fabric/tls`,
                    `${peer.name}.${Org.name}.com:/var/hyperledger/production`,
                ],
                ports: [`7051:${peer.port}`],
                networks: ["test"],
            },
        }))
    );
    return YAML.safeDump(dckr);
}
function configtxyamlgen(data) {
    let OrdererOrgs = data.org.map((org) => ({
        Name: `ord-${org.name}.com`,
        ID: `ord-${org.name}MSP`,
        MSPDir: `crypto-config/ordererOrganizations/ord-${org.name}.com/msp`,
        Policies: {
            Readers: {
                Type: "Signature",
                Rule: `OR(\'ord-${org.name}MSP.member\')`,
            },
            Writers: {
                Type: "Signature",
                Rule: `OR(\'ord-${org.name}MSP.member\')`,
            },
            Admins: {
                Type: "Signature",
                Rule: `OR(\'ord-${org.name}MSP.admin\')`,
            },
        },
        OrdererEndpoints: [`ord-${org.name}.com:7050`],
    }));
    let Orgs = data.org.map((org) => ({
        Name: `${org.name}MSP`,
        ID: `${org.name}MSP`,
        MSPDir: `crypto-config/peerOrganizations/${org.name}.com/msp`,
        Policies: {
            Readers: {
                Type: "Signature",
                Rule: `OR(\'${org.name}MSP.admin\',\'${org.name}MSP.peer\',\'${org.name}MSP.client\')`,
            },
            Writers: {
                Type: "Signature",
                Rule: `OR(\'${org.name}MSP.admin\',\'${org.name}MSP.client\')`,
            },
            Admins: {
                Type: "Signature",
                Rule: `OR(\'${org.name}MSP.admin\')`,
            },
            Endorsement: {
                Type: "Signature",
                Rule: `OR(\'${org.name}MSP.peer\')`,
            },
        },
        AnchorPeers: [{ Host: `${org.name}.com`, Port: 7051 }],
    }));
    let Capabilities = {
        Channel: { V2_0: true },
        Orderer: { V2_0: true },
        Application: { V2_0: true },
    };
    let ApplicationDefaults = {
        Organizations: null,
        Policies: {
            Readers: { Type: "ImplicitMeta", Rule: "ANY Readers" },
            Writers: { Type: "ImplicitMeta", Rule: "ANY Writers" },
            Admins: { Type: "ImplicitMeta", Rule: "MAJORITY Admins" },
            LifecycleEndorsement: {
                Type: "ImplicitMeta",
                Rule: "MAJORITY Endorsement",
            },
            Endorsement: {
                Type: "ImplicitMeta",
                Rule: "MAJORITY Endorsement",
            },
        },
        Capabilities: Capabilities.Application,
    };
    let OrdererDefaults = {
        EtcdRaft: {
            Consenters: data.org.map((org) => ({
                Host: `ord-${org.name}.com`,
                Port: 7050,
                //TODO
                //This path must be change when migrate to 2.1
                ClientTLSCert: `crypto-config/ordererOrganizations/ord-${org.name}.com/orderers/orderer.ord-${org.name}.com/tls/server.crt`,
                ServerTLSCert: `crypto-config/ordererOrganizations/ord-${org.name}.com/orderers/orderer.ord-${org.name}.com/tls/server.crt`,
            })),
        },
        BatchTimeout: "2s",
        BatchSize: {
            MaxMessageCount: 10,
            AbsoluteMaxBytes: "99 MB",
            PreferredMaxBytes: "512 KB",
        },
        Organizations: null,
        Policies: {
            Readers: { Type: "ImplicitMeta", Rule: "ANY Readers" },
            Writers: { Type: "ImplicitMeta", Rule: "ANY Writers" },
            Admins: { Type: "ImplicitMeta", Rule: "MAJORITY Admins" },
            BlockValidation: { Type: "ImplicitMeta", Rule: "ANY Writers" },
        },
    };
    let ChannelDefaults = {
        Policies: {
            Readers: { Type: "ImplicitMeta", Rule: "ANY Readers" },
            Writers: { Type: "ImplicitMeta", Rule: "ANY Writers" },
            Admins: { Type: "ImplicitMeta", Rule: "ANY Admins" },
            //defaults to MAJORITY Admins
            //But we want to sign only once for each org to join the channel
            //May cause some security issue ?
        },
        Capabilities: Capabilities.Channel,
    };
    let SingleOrgChannelProfiles = Object.assign(
        {},
        ...data.org.map((org, i) => ({
            //profile format
            [`${org.name}OrgChannel`]: {
                Consortium: "SampleConsortium",
                ...ChannelDefaults,
                Application: {
                    ...ApplicationDefaults,
                    Organizations: [Orgs[i]],
                    Capabilities: Capabilities.Application,
                },
            },
        }))
    );
    let configtx = {
        Organizations: [...OrdererOrgs, ...Orgs],
        Capabilities: Capabilities,
        Application: ApplicationDefaults,
        Orderer: OrdererDefaults,
        Channel: ChannelDefaults,
        Profiles: {
            MultiNodeEtcdRaft: {
                //system channel for genesis block generation
                ...ChannelDefaults,
                Orderer: {
                    ...OrdererDefaults,
                    Organizations: OrdererOrgs,
                    Capabilities: Capabilities.Orderer,
                },
                Consortiums: {
                    SampleConsortium: {
                        Organizations: Orgs,
                    },
                },
            },
            ...SingleOrgChannelProfiles,
        },
    };
    return YAML.safeDump(configtx);
}

async function process(id) {
    let err,
        results = await queryAsync("select data from pending where id=?", id);
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
        cmd.run("mkdir files/temp/" + cryptodir);
        await write.sync(
            "files/temp/" + cryptodir + "/crypto-config.yaml",
            cryptoyaml
        );
        await write.sync(
            "files/temp/" + cryptodir + "/configtx.yaml",
            configtxyaml
        );

        var network = { id: id, data: [] };

        var extra_hosts = "    extra_hosts:\n";       
        for (var i = 0; i < data.orgcount; i++) {
            var { networkid, PrivateIpAddress } = await aws.setupNetwork();
            network.data.push({
                Ip: PrivateIpAddress,
                networkid: networkid,
            });
            //network.data.push({})
            extra_hosts +=
                '      - "' +
                data.org[i].name +
                ".com:" +
                network.data[i].Ip +
                '"\n';
        }
        //this is for mac
        // let err,
        //     dat,
        //     stderr = await cmdgetAsync(
        //         'export PATH="$PATH:/Users/Mac/github/fabric-samples/bin";cryptogen generate --config=./files/temp/' +
        //             cryptodir +
        //             '/crypto-config.yaml --output="./files/temp/' +
        //             cryptodir +
        //             '/crypto-config"'
        //     );
        // let err1,
        //     dat1,
        //     stderr1 = await cmdgetAsync(
        //         'export PATH="$PATH:/Users/Mac/github/fabric-samples/bin";mkdir ./files/temp/' +
        //             cryptodir +
        //             "/channel-artifacts;configtxgen -configPath ./files/temp/" +
        //             cryptodir +
        //             "/ -profile MultiNodeEtcdRaft -channelID system-channel -outputBlock ./files/temp/" +
        //             cryptodir +
        //             "/channel-artifacts/genesis.block"
        //     );
        
        let err,
            dat,
            stderr = await cmdgetAsync(
                'export PATH="$PATH:/opt/gopath/src/github.com/hyperledger/fabric/bin";cryptogen generate --config=./files/temp/' +
                    cryptodir +
                    '/crypto-config.yaml --output="./files/temp/' +
                    cryptodir +
                    '/crypto-config"'
            );
        let err1,
            dat1,
            stderr1 = await cmdgetAsync(
                'export PATH="$PATH:/opt/gopath/src/github.com/hyperledger/fabric/bin";mkdir ./files/temp/' +
                    cryptodir +
                    "/channel-artifacts;configtxgen -configPath ./files/temp/" +
                    cryptodir +
                    "/ -profile MultiNodeEtcdRaft -channelID system-channel -outputBlock ./files/temp/" +
                    cryptodir +
                    "/channel-artifacts/genesis.block"
            );
        
        for (var i = 0; i < data.orgcount; i++) {
            var zip = new AdmZip();
            zip.addLocalFolder(
                "files/temp/" +
                    cryptodir +
                    "/crypto-config/ordererOrganizations/ord-" +
                    data.org[i].name +
                    ".com",
                "crypto-config/ordererOrganizations/ord-" +
                    data.org[i].name +
                    ".com"
            );
            zip.addLocalFolder(
                "files/temp/" +
                    cryptodir +
                    "/crypto-config/peerOrganizations/" +
                    data.org[i].name +
                    ".com",
                "crypto-config/peerOrganizations/" + data.org[i].name + ".com"
            );
            zip.addLocalFolder(
                "files/temp/" + cryptodir + "/channel-artifacts/",
                "channel-artifacts/"
            );
            zip.addFile(
                "docker-compose.yaml",
                Buffer.alloc(dkyaml[i].length, dkyaml[i]),
                ""
            );
            zip.addFile(
                "configtx.yaml",
                Buffer.alloc(configtxyaml.length, configtxyaml),
                ""
            );
            fs.copyFileSync(
                "files/node-base.yaml",
                "files/temp/node-base.yaml"
            );
            await insertLine("files/temp/node-base.yaml")
                .content(extra_hosts)
                .at(26);
            zip.addLocalFile("files/temp/node-base.yaml");

            var ca_keys =
                "export testnet_ca_" +
                data.org[i].name +
                "_com_PRIVATE_KEY=$(cd ./crypto-config/peerOrganizations/" +
                data.org[i].name +
                ".com/ca && ls *_sk)\n";

            const rnddownloadname = await randomstring.generate(64);
            Object.assign(network.data[i], { file: rnddownloadname + ".zip" });
            fs.copyFileSync("files/testnet.sh", "files/temp/start.sh");
            await insertLine("files/temp/start.sh").content(ca_keys).at(19);
            zip.addLocalFile("files/temp/start.sh");
            zip.writeZip("public/download/" + rnddownloadname + ".zip");
            //remove after 10 mins
            setTimeout(() => {
                fsExtra.remove("files/temp/" + cryptodir);
            }, 1000 * 60 * 10);
        }

        for (var i = 0; i < data.orgcount; i++) {
            let err,
                results = await queryAsync(
                    "select username, data from users where username=?",
                    data.org[i].name
                );
            var it = 0;
            var userdata = JSON.parse(results[0].data);
            for (var j = 0; j < userdata.pending.length; j++) {
                if (userdata.pending[j].id == id) {
                    it = j;
                }
            }
            userdata.pending.splice(it, 1);
            if (!userdata.finished) {
                userdata.finished = [];
            }
            userdata.finished.push({
                id: id,
            });
            userdata = JSON.stringify(userdata);
            await queryAsync("update users set data=? where username=?", [
                userdata,
                results[0].username,
            ]);
        }

        for (var i = 0; i < data.orgcount; i++) {
            //for local test
            network.data[i].InstanceId = await aws.launchInstanceOfNetwork(
                network.data[i].networkid,
                network.data[i].file
            );
            var ports = [];
            ports.push(80);
            ports.push(data.org[i].orderer.port);
            ports.push(data.org[i].ca.port);
            for (var j = 0; j < data.org[i].peer.length; j++) {
                ports.push(data.org[i].peer[j].port);
            }
            //for local test
            axios.post("http://proxy.cathaybc-services.com/" + proxykey, {
                subdomain: data.org[i].name + "-" + id,
                ports: ports,
                ip: network.data[i].Ip,
            });
            network.data[i].name = data.org[i].name;
            network.data[i].ports = ports;
            network.data[i].ccpfile = await randomstring.generate(64);
            client_config.ccpgen(
                data.org[i],
                "files/temp/" +
                    cryptodir +
                    "/crypto-config/peerOrganizations/" +
                    data.org[i].name +
                    ".com/tlsca/tlsca." +
                    data.org[i].name +
                    ".com-cert.pem",
                "files/temp/" +
                    cryptodir +
                    "/crypto-config/ordererOrganizations/ord-" +
                    data.org[i].name +
                    ".com/tlsca/tlsca.ord-" +
                    data.org[i].name +
                    ".com-cert.pem",
                network.data[i].networkid,
                "public/download",
                network.data[i].ccpfile + ".ccp"
            );
            network.data[i].walletfile = await randomstring.generate(64);
            client_config.walletgen(
                data.org[i],
                "public/download",
                network.data[i].walletfile,
                "files/temp/" +
                    cryptodir +
                    "/crypto-config/peerOrganizations/" +
                    data.org[i].name +
                    ".com/users/Admin@" +
                    data.org[i].name +
                    ".com/msp/keystore/priv_sk",
                "files/temp/" +
                    cryptodir +
                    "/crypto-config/peerOrganizations/" +
                    data.org[i].name +
                    ".com/users/Admin@" +
                    data.org[i].name +
                    ".com/msp/signcerts/Admin@" +
                    data.org[i].name +
                    ".com-cert.pem"
            );
        }

        network = JSON.stringify(network);
        await queryAsync("insert into networks set id=?, data=?", [
            id,
            network,
        ]);

        await queryAsync("delete from pending where id=?", id);
        return "Success";
    } else {
        return "Illegal request";
    }
}
module.exports = { process };
