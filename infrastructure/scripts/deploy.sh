#!/bin/bash

NODE_OPTIONS="--max_old_space_size=3072"
LATEST_LINK=/opt/utter/deploys/latest
SERVICE="uttercoach"

# Define usage
usage="$(basename "$0") [-h] <path-to-package>

where:
    -h  show this help text"

seed=42


while getopts ":hp" opt; do
      case $opt in

        h)
            echo "$usage"
            exit
            ;;
        \?)
              echo "Invalid option: -$OPTARG" >&2
            echo "$usage" >&2
            exit 1
              ;;
      esac
done

VERSION=${@:$OPTIND:1}
DEPLOY_PATH=/opt/utter/deploys/${VERSION}

if [ -z ${VERSION} ]; then
    echo "$usage"
    exit
fi


fetch() {
    cd ../repo/
    git fetch
    git checkout tags/${VERSION}
    meteor npm install
    meteor build --server-only ../builds/${VERSION}
    cd ../scripts/
}


cleanUp() {

    echo " * removing old package"

    sudo -u utter rm -Rf ${DEPLOY_PATH}
}


extractPackage() {

    echo " * extracting new package"

    sudo -u utter mkdir ${DEPLOY_PATH}
    sudo -u utter tar -xzf ../builds/${VERSION}/repo.tar.gz -C ${DEPLOY_PATH}
}


installPackage() {

    echo " * installing new package"

    sudo -u utter npm install --prefix ${DEPLOY_PATH}/bundle/programs/server
    sudo -u utter rm ${LATEST_LINK}
    cd ../deploys
    sudo -u utter ln -s ${VERSION} latest
    cd ../scripts
}


updatePermissions() {

    echo " * updating permission"

    sudo chown utter:users ${DEPLOY_PATH} -R
}


restartServer() {

    echo " * restarting the server"

    sudo systemctl restart ${SERVICE}
}


deploy() {

    fetch
    cleanUp
    extractPackage
    installPackage
    updatePermissions
#    restartServer
}


# Execute the deployment
deploy
