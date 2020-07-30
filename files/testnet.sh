 #!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
export PATH=${PWD}/../bin:${PWD}:$PATH
export FABRIC_CFG_PATH=${PWD}
export VERBOSE=false
OS_ARCH=$(echo "$(uname -s | tr '[:upper:]' '[:lower:]' | sed 's/mingw64_nt.*/windows/')-$(uname -m | sed 's/x86_64/amd64/g')" | awk '{print tolower($0)}')
CLI_TIMEOUT=10
CLI_DELAY=3
SYS_CHANNEL="system-channel"
LANGUAGE=golang
IMAGETAG="2.1"
CONSENSUS_TYPE="etcdraft"
COMPOSE_FILES="-f docker-compose.yaml"


# Print Usage
function printHelp() {
  echo "Usage: "
  echo "	testnet.sh generate"
  echo "	testnet.sh up"
  echo "	testnet.sh stop"
  echo "	testnet.sh down"
  echo "	testnet.sh teardown"
  echo "	testnet.sh reboot"
  echo "	testnet.sh docker_reset"
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

#Cleanup
function clearEverything() {
  docker stop $(docker container ls -aq)
  docker rm $(docker container ls -aq)
  docker network prune -f
  docker volume prune -f
}

#Check Prerequisites
function checkPrereqs() {
  LOCAL_VERSION=$(configtxlator version | sed -ne 's/ Version: //p')
  DOCKER_IMAGE_VERSION=$(docker run --rm hyperledger/fabric-tools:$IMAGETAG peer version | sed -ne 's/ Version: //p' | head -1)
  echo "=================== WARNING ==================="
  echo "   LOCAL_VERSION=$LOCAL_VERSION"
  echo "   DOCKER_IMAGE_VERSION=$DOCKER_IMAGE_VERSION"
  echo "   ATTENTION: RAFT REQUIRES AT LEAST V1.4!!!!"

  if [ "$LOCAL_VERSION" != "$DOCKER_IMAGE_VERSION" ]; then
    echo "  Local fabric binaries and docker images are  "
    echo "  out of  sync. This may cause problems.       "
  fi
  echo "================================================"
  askProceed
}

#Start Network
function networkUp() {
  checkPrereqs
  if [ ! -d "crypto-config" ]; then
    generateCerts
    generateChannelArtifacts
  fi
  IMAGE_TAG=$IMAGETAG docker-compose ${COMPOSE_FILES} up -d 2>&1
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
  if [ "$MODE" == "stop" ]; then
    docker-compose $COMPOSE_FILES stop
  fi
  if [ "$MODE" == "reboot" ]; then
    docker-compose $COMPOSE_FILES down
  fi
  if [ "$MODE" == "down" ]; then
    docker-compose $COMPOSE_FILES down
  fi
  if [ "$MODE" == "teardown" ]; then
    docker run -v $PWD:/tmp/testnet --rm hyperledger/fabric-tools:$IMAGETAG rm -Rf /tmp/testnet/ledgers-backup
    docker-compose $COMPOSE_FILES down -v --remove-orphans
    rm -rf channel-artifacts/*.block channel-artifacts/*.tx crypto-config
  fi
}

#Generate Certs
function generateCerts() {
  which cryptogen
  if [ "$?" -ne 0 ]; then
    echo "cryptogen tool not found. exiting"
    exit 1
  fi
  echo
  echo "##########################################################"
  echo "##### Generate certificates using cryptogen tool #########"
  echo "##########################################################"
  set +x
  if [ -d "crypto-config" ]; then
    rm -Rf crypto-config
  fi
  cryptogen generate --config=./crypto-config.yaml
  res=$?
  #set +x
  if [ $res -ne 0 ]; then
    echo "Failed to generate certificates..."
    exit 1
  fi
  #echo
  #echo "Generate CCP files for Org1, Org2 and Org3"
  #bash ccp-generate.sh
}

#Generate Artifacts
function generateChannelArtifacts() {
  mkdir -p channel-artifacts
  which configtxgen
  if [ "$?" -ne 0 ]; then
    echo "configtxgen tool not found. exiting"
    exit 1
  fi
  echo "##########################################################"
  echo "##############  Generating Genesis Block  ################"
  echo "##########################################################"
  echo "CONSENSUS_TYPE="$CONSENSUS_TYPE
  set -x
  configtxgen -profile MultiNodeEtcdRaft -channelID $SYS_CHANNEL -outputBlock ./channel-artifacts/genesis.block
  res=$?
  set +x
  if [ $res -ne 0 ]; then
    echo "Failed to generate orderer genesis block..."
    exit 1
  fi
}

MODE=$1;shift
if [ "$MODE" == "up" ]; then
  EXPMODE="Starting"
elif [ "$MODE" == "down" ]; then
  EXPMODE="Stopping"
elif [ "$MODE" == "stop" ]; then
  EXPMODE="Stopping"
elif [ "$MODE" == "reboot" ]; then
  EXPMODE="Rebooting"
elif [ "$MODE" == "generate" ]; then
  EXPMODE="Generating certs and genesis block"
elif [ "$MODE" == "teardown" ]; then
  EXPMODE="Tearing Down"
elif [ "$MODE" == "docker_reset" ]; then
  EXPMODE="Resetting docker"
else
  printHelp
  exit 1
fi

echo "${EXPMODE} with CLI timeout of '${CLI_TIMEOUT}' seconds and CLI delay of '${CLI_DELAY}' seconds and using consensus $CONSENSUS_TYPE witih system channel $SYS_CHANNEL"

askProceed

if [ "${MODE}" == "up" ]; then ## Start Network
  networkUp
elif [ "${MODE}" == "down" ]; then ## Close Network
  networkDown
elif [ "${MODE}" == "teardown" ]; then ## Clear Network
  networkDown
elif [ "${MODE}" == "stop" ]; then ## Stop Network
  networkDown
elif [ "${MODE}" == "generate" ]; then ## Generate Artifacts
  generateCerts
  #generateChannelArtifacts
elif [ "${MODE}" == "reboot" ]; then ## reboot the network
  networkDown
  networkUp
elif [ "${MODE}" == "docker_reset" ]; then ## reboot the network
  clearEverything
else
  printHelp
  exit 1
fi
