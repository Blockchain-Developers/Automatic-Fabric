#!/bin/bash

export PATH=${PWD}/../bin:${PWD}:$PATH
export FABRIC_CFG_PATH=${PWD}
export VERBOSE=false
# OS_ARCH=$(echo "$(uname -s | tr '[:upper:]' '[:lower:]' | sed 's/mingw64_nt.*/windows/')-$(uname -m | sed 's/x86_64/amd64/g')" | awk '{print tolower($0)}')
IMAGETAG="1.4.4"
CONSENSUS_TYPE="etcdraft"
COMPOSE_FILES="-f docker-compose.yaml"

#print help
function printHelp() {
    echo "Usage: "
    echo "  byfn.sh <mode> [-v]"
    echo "    <mode> - one of 'up', 'down' or 'restart'"
    echo "      - 'up' - bring up the network with docker-compose up"
    echo "      - 'down' - clear the network with docker-compose down"
    echo "      - 'restart' - restart the network"
    echo "    -v - verbose mode"
    echo "  byfn.sh -h (print this message)"
}

# Confirm
function askProceed() {
  read -p "Continue? [Y/n] " ans
  case "$ans" in
  y | Y | "")
    echo "proceeding ..."
    ;;
  n | N)
    echo "exiting..."
    exit 1
    ;;
  *)
    echo "invalid response"
    askProceed
    ;;
  esac
}

function clearContainers() {
    CONTAINER_IDS=$(docker ps -a | awk '($2 ~ /dev-peer.*/) {print $1}')
    if [ -z "$CONTAINER_IDS" -o "$CONTAINER_IDS" == " " ]; then
        echo "---- No containers available for deletion ----"
    else
        docker rm -f $CONTAINER_IDS
    fi
}

function removeUnwantedImages() {
    DOCKER_IMAGE_IDS=$(docker images | awk '($1 ~ /dev-peer.*/) {print $3}')
    if [ -z "$DOCKER_IMAGE_IDS" -o "$DOCKER_IMAGE_IDS" == " " ]; then
        echo "---- No images available for deletion ----"
    else
        docker rmi -f $DOCKER_IMAGE_IDS
    fi
}

BLACKLISTED_VERSIONS="^1\."

#Check Prerequisites
function checkPrereqs() {
    LOCAL_VERSION=$(configtxlator version | sed -ne 's/ Version: //p')
    DOCKER_IMAGE_VERSION=$(docker run --rm hyperledger/fabric-tools:$IMAGETAG peer version | sed -ne 's/ Version: //p' | head -1)
    echo "================== ATTENTION ==================="
    echo "   LOCAL_VERSION=$LOCAL_VERSION"
    echo "   DOCKER_IMAGE_VERSION=$DOCKER_IMAGE_VERSION"
    echo "   "
    echo "========= RAFT REQUIRES AT LEAST V.1.4 ========="

    if [ "$LOCAL_VERSION" != "$DOCKER_IMAGE_VERSION" ]; then
        echo "=================== WARNING ==================="
        echo "  Local fabric binaries and docker images are  "
        echo "  out of  sync. This may cause problems.       "
        echo "==============================================="
    fi

    for UNSUPPORTED_VERSION in $BLACKLISTED_VERSIONS; do
        echo "$LOCAL_VERSION" | grep -q $UNSUPPORTED_VERSION
        if [ $? -eq 0 ]; then
            echo "ERROR! Local Fabric binary version of $LOCAL_VERSION does not match this newer version of BYFN and is unsupported. Either move to a later version of Fabric or checkout an earlier version of fabric-samples."
            exit 1
        fi

        echo "$DOCKER_IMAGE_VERSION" | grep -q $UNSUPPORTED_VERSION
        if [ $? -eq 0 ]; then
            echo "ERROR! Fabric Docker image version of $DOCKER_IMAGE_VERSION does not match this newer version of BYFN and is unsupported. Either move to a later version of Fabric or checkout an earlier version of fabric-samples."
            exit 1
        fi
    done
    echo "Check prerequisite done. Keep going?"
    askProceed
}

#Start Network
function networkUp() {
    checkPrereqs
    IMAGE_TAG=$IMAGETAG docker-compose ${COMPOSE_FILES} up -d 2>&1
 #  export BYFN_CA1_PRIVATE_KEY=$(cd crypto-config/peerOrganizations/org1.example.com/ca && ls *_sk)
    docker ps -a
    if [ $? -ne 0 ]; then
        echo "ERROR !!!! Unable to start network"
        exit 1
    fi
    sleep 1
    echo "Sleeping 15s to allow etcdraft cluster to complete booting"
    sleep 14
}

#Close Network
function networkDown() {
    if [ "$MODE" == "down" ]; then
        docker-compose $COMPOSE_FILES down
    elif [ "$MODE" == "stop" ]; then
        docker-compose $COMPOSE_FILES stop
    elif [ "$MODE" == "reboot" ]; then
        docker-compose $COMPOSE_FILES down
    elif [ "$MODE" == "teardown" ]; then
        docker run -v $PWD:/tmp/testnet --rm hyperledger/fabric-tools:$IMAGETAG rm -Rf /tmp/testnet/ledgers-backup
        docker-compose $COMPOSE_FILES down -v --remove-orphans
        rm -rf channel-artifacts/*.block channel-artifacts/*.tx crypto-config
        clearContainers
        removeUnwantedImages
    fi
}

MODE=$1
shift
if [ "$MODE" == "up" ]; then
  EXPMODE="Starting"
elif [ "$MODE" == "down" ]; then
  EXPMODE="Stopping"
elif [ "$MODE" == "stop" ]; then
  EXPMODE="Stopping"
elif [ "$MODE" == "reboot" ]; then
  EXPMODE="Rebooting"
elif [ "$MODE" == "teardown" ]; then
  EXPMODE="Tearing Down"
else
  printHelp
  exit 1
fi

echo "${EXPMODE} with consensus $CONSENSUS_TYPE"

askProceed

if [ "${MODE}" == "up" ]; then ## Start Network
  networkUp
elif [ "${MODE}" == "down" ]; then ## Close Network
  networkDown
elif [ "${MODE}" == "stop" ]; then ## Stop Network
  networkDown
elif [ "${MODE}" == "reboot" ]; then ## reboot the network
  networkDown
  networkUp
elif [ "${MODE}" == "teardown" ]; then ## Clear Network
  networkDown
else
  printHelp
  exit 1
fi
