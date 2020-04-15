# Automatic-Fabric

Setting up
1. Install Hyperledger Fabric v1.4.4 [see here](https://github.com/hyperledger/fabric/tree/release-1.4)
2. Build ui-dev and copy files to server
```
cd ui-dev
yarn install
yarn run build
cp -a . ../server/public
```
3. Start the server
```
cd ../server
yarn start
```
