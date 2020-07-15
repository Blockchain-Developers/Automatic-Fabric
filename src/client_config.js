const { Wallet } = require("fabric-network");
const fs = require("fs");

//this will generate cpp file
function ccpgen(
    org,
    orgtlspath,
    orderertlspath,
    networkid,
    ccpPath,
    filename,
    domain = "cathaybc-services.com"
) {
    let fulldomain = `${org.name}-${networkid}.${domain}`;
    let ccp = {
        name: "Network",
        version: "1.1",
        organizations: {
            [`${org.name}`]: {
                mspid: `${org.name}MSP`,
                peers: org.peer.map((peer) => peer.name),
            },
        },
        orderers: {
            [`${org.name}`]: {
                url: `grpcs://${fulldomain}:${org.orderer.port}`,
                grpcOptions: {
                    "ssl-target-name-override": fulldomain,
                },
                tlsCACerts: {
                    pem: fs.readFileSync(orderertlspath),
                },
            },
        },
        peers: {
            [`${org.peer[0].name}`]: {
                url: `grpcs://${fulldomain}:${org.peer[0].port}`,
                grpcOptions: {
                    "ssl-target-name-override": fulldomain,
                },
                tlsCACerts: {
                    pem: fs.readFileSync(orgtlspath),
                },
            },
        },
    };
    fs.writeFileSync(ccpPath + "/" + filename, JSON.stringify(ccp));
}

//this will generate the wallet file
async function walletgen(
    org,
    walletDir,
    filename,
    privatekeypath,
    publickeypath
) {
    let pub = fs.readFileSync(publickeypath);
    let priv = fs.readFileSync(privatekeypath);
    const x509Identity = {
        credentials: {
            certificate: pub.toString(),
            privateKey: priv, //need to be bytestring
        },
        mspId: `${org.name}MSP`,
        type: "X.509",
    };
    const wallet = await Wallets.newFileSystemWallet(walletDir);
    await wallet.put(filename, x509Identity);
}
module.exports = { ccpgen, walletgen };
