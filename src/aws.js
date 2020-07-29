const AWS = require("aws-sdk");

AWS.config.update({ region: "us-east-1" });

const ec2 = new AWS.EC2({ apiVersion: "2016-11-15" });
const userData = "";
async function createNetworkInterface(networkconfig) {
    let data = await ec2.createNetworkInterface(networkconfig).promise();
    //console.log(data);
    return {
        networkid: data.NetworkInterface.NetworkInterfaceId,
        PrivateIpAddress: data.NetworkInterface.PrivateIpAddress,
    };
}

async function allocateAddress() {
    let data = await ec2.allocateAddress({ Domain: "vpc" }).promise();
    return data;
}
async function releaseAddress(allocateid) {
    let data = await ec2.releaseAddress({ AllocationId: allocateid }).promise();
    return data;
}

async function associateAddress(allocateid, networkid) {
    let params = {
        AllocationId: allocateid,
        NetworkInterfaceId: networkid,
    };
    let data = await ec2.associateAddress(params).promise();
    return data;
}
async function disassociateAddress(associteid) {
    return ec2.disassociateAddress({ AssociationId: associteid });
}

async function deleteNetworkInterface(networkid) {
    let data = await ec2
        .deleteNetworkInterface({ NetworkInterfaceId: networkid })
        .promise();
}

async function launchInstance(params) {
    let data = await ec2.runInstances(params).promise();
    //console.log(data);
    return data.Instances[0].InstanceId;
}

async function attachInterface(params) {
    let data = await ec2.attachNetworkInterface(params).promise();
    //console.log(data);
    return data;
}
async function setupNetwork(use_public_ip = false) {
    let networkconfig = {
        Description: "BlockChainNetwork",
        Groups: ["sg-02ccaa6d2af666c9a"],
        SubnetId: "subnet-0d34a87f8aa4829d5",
    };
    if (use_public_ip) {
        let { networkid } = await createNetworkInterface(networkconfig);
        let { AllocationId, PublicIp } = await allocateAddress();
        let { AssociationId } = await associateAddress(AllocationId, networkid);
        return { networkid, PublicIp, AssociationId, AllocationId };
    } else {
        let { networkid, PrivateIpAddress } = await createNetworkInterface(
            networkconfig
        );
        return { networkid, PrivateIpAddress };
    }
}
async function launchInstanceOfNetwork(networkid, filename, pubkey, id) {
    const downloadUrl = "http://cathaybc-services.com/download/" + filename;
    const UserData = `#!/bin/bash\n\
    apt-get update\n\
    apt-get install -y apt-transport-https ca-certificates curl gnupg-agent software-properties-common wget zip unzip\n\
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -\n\
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"\n\
    apt-get update\n\
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io\n\
    curl -L "https://github.com/docker/compose/releases/download/1.25.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose\n\
    chmod +x /usr/local/bin/docker-compose\n\
    wget ${downloadUrl}\n\
    unzip ${filename} \n\
    wget http://cathaybc-services.com/run-safe.zip\n\
    unzip run-safe.zip\n\
    cd run-safe\n\
    echo ${pubkey} > org.pub\n\
    echo ${id} > id\n\
    docker build -t run-safe .\n\
    docker run -td -p 80:80 run-safe\n\
    curl -sSL http://bit.ly/2ysbOFE | bash -s -- -d -s\n\
    chmod 755 start.sh\n\
    ./start.sh up\n`;
    let instanceParams = {
        LaunchTemplate: { LaunchTemplateId: "lt-0f9ee5f9a42217a4f" },
        MaxCount: 1,
        MinCount: 1,
        NetworkInterfaces: [
            {
                NetworkInterfaceId: networkid,
                DeviceIndex: 0,
            },
        ],
        UserData: Buffer.from(UserData).toString('base64'),
    };
    let InstanceId = await launchInstance(instanceParams);
    return InstanceId;
}
async function test() {
    let { networkid, PrivateIpAddress } = await setupNetwork();
    let InstanceId = await launchInstanceOfNetwork(networkid);
}
//test();
module.exports = { setupNetwork, launchInstanceOfNetwork };
