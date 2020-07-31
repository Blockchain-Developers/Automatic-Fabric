const express = require("express");
const AdmZip = require("adm-zip");
const randomstring = require("randomstring");
// var CronJob = require("cron").CronJob;
const fs = require("fs");
const fsExtra = require("fs-extra");
const YAML = require("js-yaml");
const insertLine = require("insert-line");
const write = require("write");
const cmd = require("node-cmd");
const aws = require("./aws");
/* eslint-disable */
const client_config = require("./client_config.js");
const router = express.Router();
/* eslint-enable */
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

const dkyaml = [];
/**
 *Generates crypto-config.yaml
 *@param {object} data data object
 *@return {string} yaml stream
 */
function cryptoyamlgen(data) {
    let crypto;
    crypto = '{"OrdererOrgs":[';
    for (let i = 0; i < data.orgcount; i++) {
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
    for (let i = 0; i < data.orgcount; i++) {
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
        for (let j = 1; j < data.org[i].peercount; j++) {
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
/**
 *Generates generates docker-compose.yaml
 *@param {object} data data object
 *@param {int} orgnumber number of orgs
 *@return {string} yaml stream
 */
function dckryamlgen(data, orgnumber, extrahosts) {
    const Org = data.org[orgnumber];
    const peer_default = {
        image: "hyperledger/fabric-peer:2.1",
        working_dir: "/opt/gopath/src/github.com/hyperledger/fabric/peer",
        environment: [
            "CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock",
            "CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=${COMPOSE_PROJECT_NAME}_network",
            "FABRIC_LOGGING_SPEC=INFO",
            "CORE_PEER_TLS_ENABLED=true",
            "CORE_PEER_GOSSIP_USELEADERELECTION=true",
            "CORE_PEER_GOSSIP_ORGLEADER=false",
            "CORE_PEER_PROFILE_ENABLED=true",
            "CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt",
            "CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key",
            "CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt",
            "CORE_CHAINCODE_EXECUTETIMEOUT=300s",
        ],
        command: "peer node start",
        extra_hosts: extrahosts,
    };
    const orderer_default = {
        image: "hyperledger/fabric-orderer:2.1",
        environment: [
            "FABRIC_LOGGING_SPEC=INFO",
            "ORDERER_GENERAL_LISTENADDRESS=0.0.0.0",
            "ORDERER_GENERAL_GENESISMETHOD=file",
            "ORDERER_GENERAL_GENESISFILE=/var/hyperledger/orderer/orderer.genesis.block",
            "ORDERER_GENERAL_LOCALMSPID=OrdererMSP",
            "ORDERER_GENERAL_LOCALMSPDIR=/var/hyperledger/orderer/msp",
            "ORDERER_GENERAL_TLS_ENABLED=true",
            "ORDERER_GENERAL_TLS_PRIVATEKEY=/var/hyperledger/orderer/tls/server.key",
            "ORDERER_GENERAL_TLS_CERTIFICATE=/var/hyperledger/orderer/tls/server.crt",
            "ORDERER_GENERAL_TLS_ROOTCAS=[/var/hyperledger/orderer/tls/ca.crt]",
            "ORDERER_GENERAL_CLUSTER_CLIENTCERTIFICATE=/var/hyperledger/orderer/tls/server.crt",
            "ORDERER_GENERAL_CLUSTER_CLIENTPRIVATEKEY=/var/hyperledger/orderer/tls/server.key",
            "ORDERER_GENERAL_CLUSTER_ROOTCAS=[/var/hyperledger/orderer/tls/ca.crt]",
        ],
        working_dir: "/opt/gopath/src/github.com/hyperledger/fabric",
        command: "orderer",
        extra_hosts: extrahosts,
    };
    const dckr = {
        version: "3",
        volumes: Object.assign(
            {},
            ...Org.peer.map((peer) => ({
                [`${peer.name}.${Org.name}.com`]: null,
            })),
            {
                [`orderer.ord-${Org.name}.com`]: null,
            }
        ),
        networks: {
            test: null,
        },
        services: {
            [`ca.${Org.name}.com`]: {
                image: "hyperledger/fabric-ca:1.4.7",
                environment: [
                    "FABRIC_CA_HOME=/etc/hyperledger/fabric-ca-server",
                    `FABRIC_CA_SERVER_CA_NAME=ca-${Org.name}`,
                    "FABRIC_CA_SERVER_TLS_ENABLED=true",
                    `FABRIC_CA_SERVER_TLS_CERTFILE=/etc/hyperledger/fabric-ca-server/ca.org1.${Org.name}.com-cert.pem`,
                    "FABRIC_CA_SERVER_PORT=7054",
                ],
                ports: [`${Org.ca.port}:7054`],
                command: "sh -c 'fabric-ca-server start -b admin:adminpw -d'",
                volumes: [
                    `./crypto-config/peerOrganizations/${Org.name}/ca:/etc/hyperledger/fabric-ca-server`,
                ],
                container_name: `ca_${Org.name}`,
                networks: ["test"],
            },
            [`orderer.ord-${Org.name}.com`]: {
                image: orderer_default.image,
                working_dir: orderer_default.working_dir,
                command: orderer_default.command,
                environment: [
                    "ORDERER_GENERAL_LISTENPORT=7050",
                    ...orderer_default.environment,
                ],
                container_name: `orderer.ord-${Org.name}.com`,
                networks: ["test"],
                volumes: [
                    "./channel-artifacts/genesis.block:/var/hyperledger/orderer/orderer.genesis.block",
                    `./crypto-config/ordererOrganizations/ord-${Org.name}.com/orderers/orderer.ord-${Org.name}.com/msp:/var/hyperledger/orderer/msp`,
                    `./crypto-config/ordererOrganizations/ord-${Org.name}.com/orderers/orderer.ord-${Org.name}.com/tls/:/var/hyperledger/orderer/tls`,
                    `orderer.ord-${Org.name}.com:/var/hyperledger/production/orderer`,
                ],
                ports: [`${Org.orderer.port}:7050`],
                extra_hosts: orderer_default.extra_hosts
            },
        },
    };
    Object.assign(
        dckr.services,
        ...Org.peer.map((peer) => ({
            [`${peer.name}.${Org.name}.com`]: {
                image: peer_default.image,
                working_dir: peer_default.working_dir,
                command: peer_default.command,
                container_name: `${peer.name}.${Org.name}.com`,
                environment: [
                    `CORE_PEER_ID=${peer.name}.${Org.name}.com`,
                    `CORE_PEER_ADDRESS=${peer.name}.${Org.name}.com:7051`,
                    `CORE_PEER_LISTENADDRESS=0.0.0.0:7051`,
                    `CORE_PEER_CHAINCODEADDRESS=${peer.name}.${Org.name}.com:7052`,
                    `CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:7052`,
                    `CORE_PEER_GOSSIP_EXTERNALENDPOINT=${peer.name}.${Org.name}.com:7051`,
                    `CORE_PEER_GOSSIP_BOOTSTRAP=${Org.peer[0].name}.${Org.name}.com:7051`,
                    `CORE_PEER_LOCALMSPID=${Org.name}MSP`,
                    ...peer_default.environment,
                ],
                volumes: [
                    "/var/run/:/host/var/run",
                    `./crypto-config/peerOrganizations/${Org.name}.com/peers/${peer.name}.${Org.name}.com/msp:/etc/hyperledger/fabric/msp`,
                    `./crypto-config/peerOrganizations/${Org.name}.com/peers/${peer.name}.${Org.name}.com/tls:/etc/hyperledger/fabric/tls`,
                    `${peer.name}.${Org.name}.com:/var/hyperledger/production`,
                ],
                ports: [`${peer.port}:7051`],
                networks: ["test"],
                extra_hosts: peer_default.extra_hosts,
            },
        }))
    );
    return YAML.safeDump(dckr);
}
/**
 *Generates configtx.yaml
 *@param {object} data data object
 *@return {string} yaml stream
 */
function configtxyamlgen(data) {
    const OrdererOrgs = data.org.map((org) => ({
        Name: `ord-${org.name}.com`,
        ID: `ord-${org.name}MSP`,
        MSPDir: `crypto-config/ordererOrganizations/ord-${org.name}.com/msp`,
        Policies: {
            Readers: {
                Type: "Signature",
                Rule: `OR('ord-${org.name}MSP.member')`,
            },
            Writers: {
                Type: "Signature",
                Rule: `OR('ord-${org.name}MSP.member')`,
            },
            Admins: {
                Type: "Signature",
                Rule: `OR('ord-${org.name}MSP.admin')`,
            },
        },
        OrdererEndpoints: [`ord-${org.name}.com:7050`],
    }));
    const Orgs = data.org.map((org) => ({
        Name: `${org.name}MSP`,
        ID: `${org.name}MSP`,
        MSPDir: `crypto-config/peerOrganizations/${org.name}.com/msp`,
        Policies: {
            Readers: {
                Type: "Signature",
                Rule: `OR('${org.name}MSP.admin','${org.name}MSP.peer','${org.name}MSP.client')`,
            },
            Writers: {
                Type: "Signature",
                Rule: `OR('${org.name}MSP.admin','${org.name}MSP.client')`,
            },
            Admins: {
                Type: "Signature",
                Rule: `OR('${org.name}MSP.admin')`,
            },
            Endorsement: {
                Type: "Signature",
                Rule: `OR('${org.name}MSP.peer')`,
            },
        },
        AnchorPeers: [
            {
                Host: `${org.name}.com`,
                Port: 7051,
            },
        ],
    }));
    const Capabilities = {
        Channel: {
            V2_0: true,
        },
        Orderer: {
            V2_0: true,
        },
        Application: {
            V2_0: true,
        },
    };
    const ApplicationDefaults = {
        Organizations: null,
        Policies: {
            Readers: {
                Type: "ImplicitMeta",
                Rule: "ANY Readers",
            },
            Writers: {
                Type: "ImplicitMeta",
                Rule: "ANY Writers",
            },
            Admins: {
                Type: "ImplicitMeta",
                Rule: "MAJORITY Admins",
            },
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
    const OrdererDefaults = {
        EtcdRaft: {
            Consenters: data.org.map((org) => ({
                Host: `orderer.ord-${org.name}.com`,
                Port: 7050,
                // TODO
                // This path must be change when migrate to 2.1
                ClientTLSCert: `crypto-config/ordererOrganizations/ord-${org.name}.com/orderers/orderer.ord-${org.name}.com/tls/server.crt`,
                ServerTLSCert: `crypto-config/ordererOrganizations/ord-${org.name}.com/orderers/orderer.ord-${org.name}.com/tls/server.crt`,
            })),
            Options: {
                TickInterval: "500ms",
                ElectionTick: 10,
                HeartbeatTick: 1,
                MaxInflightBlocks: 5,
                SnapshotIntervalSize: 20971520,
            },
        },
        BatchTimeout: "2s",
        BatchSize: {
            MaxMessageCount: 10,
            AbsoluteMaxBytes: "99 MB",
            PreferredMaxBytes: "512 KB",
        },
        Organizations: null,
        Policies: {
            Readers: {
                Type: "ImplicitMeta",
                Rule: "ANY Readers",
            },
            Writers: {
                Type: "ImplicitMeta",
                Rule: "ANY Writers",
            },
            Admins: {
                Type: "ImplicitMeta",
                Rule: "MAJORITY Admins",
            },
            BlockValidation: {
                Type: "ImplicitMeta",
                Rule: "ANY Writers",
            },
        },
    };
    const ChannelDefaults = {
        Policies: {
            Readers: {
                Type: "ImplicitMeta",
                Rule: "ANY Readers",
            },
            Writers: {
                Type: "ImplicitMeta",
                Rule: "ANY Writers",
            },
            Admins: {
                Type: "ImplicitMeta",
                Rule: "ANY Admins",
            },
            // defaults to MAJORITY Admins
            // But we want to sign only once for each org to join the channel
            // May cause some security issue ?
        },
        Capabilities: Capabilities.Channel,
    };
    const SingleOrgChannelProfiles = Object.assign(
        {},
        ...data.org.map((org, i) => ({
            // profile format
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
    const configtx = {
        Organizations: [...OrdererOrgs, ...Orgs],
        Capabilities: Capabilities,
        Application: ApplicationDefaults,
        Orderer: OrdererDefaults,
        Channel: ChannelDefaults,
        Profiles: {
            MultiNodeEtcdRaft: {
                // system channel for genesis block generation
                ...ChannelDefaults,
                Orderer: {
                    ...OrdererDefaults,
                    OrdererType: "etcdraft",
                    Addresses: data.org.map(
                        (org) => `ord-${org.name}.com:${org.orderer.port}`
                    ),
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
/**
 *Main Process Function
 *@param {string} id network id
 *@return {string} result
 */
async function process(id) {
    let err,
        results = await queryAsync("select data from pending where id=?", id);
    if (err) {
        console.log(err);
    }
    if (results.length) {
        let data = results[0].data;
        data = await JSON.parse(data);
        let extrahosts = [];
        let network = {
            id: id,
            data: [],
        };
        for (let i = 0; i < data.orgcount; i++) {
            const { networkid, PrivateIpAddress } = await aws.setupNetwork();
            network.data.push({
                Ip: PrivateIpAddress,
                networkid: networkid,
            });// DEBUG:
            for(let j = 0; j < data.org[i].peer.length; j++) {
              extrahosts.push(
                  data.org[i].peer[j].name + '.' + data.org[i].name + ".com:" + network.data[i].Ip
              );
            }
            extrahosts.push(
                'orderer.ord-' + data.org[i].name + ".com:" + network.data[i].Ip
            );
        }

        for (let i = 0; i < data.orgcount; i++) {
            dkyaml[i] = await dckryamlgen(data, i, extrahosts);
            // dckryaml=await dckryamlgen(data);
        }
        let configtxyaml = await configtxyamlgen(data);
        let cryptoyaml = await cryptoyamlgen(data);
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

        // this is for mac
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
        if (err) {
            console.log(err);
        }
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
        let definition = [];
        for (let i = 0; i < data.orgcount; i++) {
          let err2,
              dat2,
              stderr2 = await cmdgetAsync(
                  'export PATH="$PATH:/opt/gopath/src/github.com/hyperledger/fabric/bin";export FABRIC_CFG_PATH=files/temp/' + cryptodir + ';configtxgen -printOrg ' +
                      data.org[i].name +
                      'MSP'
              );
              definition.push(stderr2);
        }

        for (let i = 0; i < data.orgcount; i++) {
            const zip = new AdmZip();
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
            for(let j=0; j< data.orgcount; j++) {
              zip.addFile(
                  data.org[j].name+".json",
                  Buffer.alloc(definition[j].length, definition[j]),
                  ""
              );
            }
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

            const ca_keys =
                "export testnet_ca_" +
                data.org[i].name +
                "_com_PRIVATE_KEY=$(cd ./crypto-config/peerOrganizations/" +
                data.org[i].name +
                ".com/ca && ls *_sk)\n";

            const rnddownloadname = await randomstring.generate(64);
            Object.assign(network.data[i], {
                file: rnddownloadname + ".zip",
            });
            fs.copyFileSync("files/testnet.sh", "files/temp/start.sh");
            await insertLine("files/temp/start.sh").content(ca_keys).at(19);
            zip.addLocalFile("files/temp/start.sh");
            zip.writeZip("public/download/" + rnddownloadname + ".zip");

            // remove after 10 mins
            setTimeout(() => {
                fsExtra.remove("files/temp/" + cryptodir);
            }, 1000 * 60 * 10);
        }

        for (let i = 0; i < data.orgcount; i++) {
            let err,
                results = await queryAsync(
                    "select username, data, pubkey from users where username=?",
                    data.org[i].name
                );
            if (err) {
                console.log(err);
            }
            let it = 0;
            let userdata = JSON.parse(results[0].data);
            for (let j = 0; j < userdata.pending.length; j++) {
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

        for (let i = 0; i < data.orgcount; i++) {
            // comment out for local test
            let iddata = {};
            iddata.org = data.org[i];
            iddata.networkid = network.data[i].networkid;
            iddata.location =
                data.org[i].name + "-" + id + ".cathaybc-services.com";
            iddata = JSON.stringify(iddata);
            network.data[
                i
            ].InstanceId = await aws.launchInstanceOfNetwork(
                network.data[i].networkid,
                network.data[i].file,
                results[0].pubkey,
                { getconnectionprofile: iddata }
            );
            const ports = [];
            ports.push(80);
            ports.push(data.org[i].orderer.port);
            ports.push(data.org[i].ca.port);
            for (let j = 0; j < data.org[i].peer.length; j++) {
                ports.push(data.org[i].peer[j].port);
            }

            network.data[i].ccpfile = await randomstring.generate(64);
            client_config.ccpgen(
              data.org[i],
              "files/temp/" + cryptodir + "/crypto-config/peerOrganizations/"+data.org[i].name+".com/tlsca/tlsca."+data.org[i].name+".com-cert.pem",
              "files/temp/" + cryptodir + "/crypto-config/ordererOrganizations/ord-"+data.org[i].name+".com/tlsca/tlsca.ord-"+data.org[i].name+".com-cert.pem",
              network.data[i].networkid,
              "public/download",
              network.data[i].ccpfile+'.json'
            );
            network.data[i].walletfile = await randomstring.generate(64);
            let privkeyfilename = (await fs.readdirSync("files/temp/" + cryptodir + "/crypto-config/peerOrganizations/"+data.org[i].name+".com/users/Admin@"+data.org[i].name+".com/msp/keystore/"))[0];
            client_config.walletgen(
              data.org[i],
              "public/download",
              network.data[i].walletfile,
              "files/temp/" + cryptodir + "/crypto-config/peerOrganizations/"+data.org[i].name+".com/users/Admin@"+data.org[i].name+".com/msp/signcerts/Admin@"+data.org[i].name+".com-cert.pem",
              "files/temp/" + cryptodir + "/crypto-config/peerOrganizations/"+data.org[i].name+".com/users/Admin@"+data.org[i].name+".com/msp/keystore/"+privkeyfilename
            );
            // comment out for local test
            axios.post("http://proxy.cathaybc-services.com/" + proxykey, {
                subdomain: data.org[i].name + "-" + id,
                ports: ports,
                ip: network.data[i].Ip,
            });
            network.data[i].name = data.org[i].name;
            network.data[i].ports = ports;
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
module.exports = {
    process,
};
