# DSChain

Make sure you follow the tutorial provided by fabric

## Restart hyperledger

    ./restart.sh

## Some environment variable in $HOME/.bashrc or $HOME/.zshrc

    export FABRIC_HOME=<path to the fabric-samples>
    export PATH=$FABRIC_HOME/bin:$PATH

## Deploy contract to chain

    ./deploy.sh <name-of-package>

## Simple Test

    yarn start:app
