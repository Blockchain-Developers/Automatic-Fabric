const AWS = require("aws-sdk");

AWS.config.update({ region: "us-east-1" });
/*
var instanceParams = {
    LaunchTemplate: { LaunchTemplateId: "lt-0f9ee5f9a42217a4f" },
    MaxCount: 1,
    MinCount: 1,
};

const ec2 = new AWS.EC2({ apiVersion: "2016-11-15" })
    .runInstances(instanceParams)
    .promise();

ec2.then((data) => {
    console.log(data);
    let instanceId = data.Instances[0].InstanceId;
    console.log("Created instance", instanceId);
    tagParams = {
        Resources: [instanceId],
        Tags: [
            {
                Key: "Name",
                Value: "SDK_GENERATE",
            },
        ],
    };
    // Create a promise on an EC2 service object
    var tagPromise = new AWS.EC2({ apiVersion: "2016-11-15" })
        .createTags(tagParams)
        .promise();
    // Handle promise's fulfilled/rejected states
    tagPromise
        .then(function (data) {
            console.log("Instance tagged");
        })
        .catch(function (err) {
            console.error(err, err.stack);
        });
}).catch((err) => {
    console.error(err, err.stack);
});
var params = {
    InstanceIds:["i-0b1fcb6ef48f7b90a"]
}
const ec2 = new AWS.EC2({ apiVersion: "2016-11-15" }).terminateInstances(params).promise()
ec2.then( (data)=>{console.log(data)}).catch( (err) => {console.error(err)});
*/

const ec2 = new AWS.EC2({ apiVersion: "2016-11-15" });
async function createNetworkInterface(networkconfig) {
    let data = await ec2.createNetworkInterface(networkconfig).promise();
    console.log(data);
    return {
        networkid: data.NetworkInterface.NetworkInterfaceId,
        PrivateIpAddress: data.NetworkInterface.PrivateIpAddress,
    };
}

async function allocateAddress() {
    let data = await ec2.allocateAddress({ Domain: "vpc" }).promise();
    console.log(data);
    /*
    data = {
         AllocationId: "eipalloc-64d5890a",
         Domain: "vpc",
         PublicIp: "203.0.113.0"
    }
    */
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
    console.log(data);
    /*
    data = {
        AssociationId: "eipassoc-2bebb745"
    }
    */
    return data;
}
async function disassociateAddress(associteid) {
    return ec2.disassociateAddress({ AssociationId: associteid });
}

async function deleteNetworkInterface(networkid) {
    let data = await ec2
        .deleteNetworkInterface({ NetworkInterfaceId: networkid })
        .promise();
    console.log(data);
}

async function launchInstance(params) {
    let data = await ec2.runInstances(params).promise();
    console.log(data);
    return data.Instances[0].InstanceId;
}

async function attachInterface(params) {
    let data = await ec2.attachNetworkInterface(params).promise();
    console.log(data);
    return data;
}
async function setupNetwork(use_public_ip = true) {
    var networkconfig = {
        Description: "Org1Network",
        Groups: ["sg-02ccaa6d2af666c9a"],
        SubnetId: "subnet-097c7e8f9cc74a89e",
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

    // let InstanceId = await launchInstance(instanceParams);
    // let attachparams = {
    //     NetworkInterfaceId: networkid,
    //     InstanceId: InstanceId,
    //     DeviceIndex: 0,
    // };
    // attachInterface(attachparams);
    // deleteNetworkInterface("eni-0108653ef100950f3");
}
async function launchInstanceOfNetwork(networkid) {
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
    };
    let InstanceId = await launchInstance(instanceParams);
    return InstanceId;
}
async function test() {
    let { networkid, PublicIp } = await setupNetwork();
    let InstanceId = await launchInstanceOfNetwork(networkid);
}
module.exports = {setupNetwork, launchInstanceOfNetwork};
