#!/usr/bin/env bash

# If error code, stop script
set -e

# Install packages
npm config set strict-ssl false
npm install

# Build
npm run build

if [ "$#" -ne 0 ] && [ $1 = "--release" ]
then
    # Increment package json
    npm version $2 -m "Released %s"
    npm publish
    git push --follow-tags

    # Clone website and push demo
    CLONE_DIR="target"
    GITHUB_IO="pepsryuu.github.io"
    GITHUB_IO_DEMO="$CLONE_DIR/$GITHUB_IO/demo/scrollbar-framework"

    (
        rm -rf $CLONE_DIR &&
        mkdir -p $CLONE_DIR &&
        cd $CLONE_DIR &&
        git clone git@github.com:PepsRyuu/$GITHUB_IO.git &&
        cd $GITHUB_IO && 
        git config user.email "paul-sweeney@outlook.ie"
    )
        
    rm -rf $GITHUB_IO_DEMO
    mkdir -p $GITHUB_IO_DEMO
    cp -R examples/preact/* $GITHUB_IO_DEMO

    (
        cd $GITHUB_IO_DEMO && 
        npm install &&
        git add --all &&
        git commit -am "Added demo for scrollbar-framework"
        git push origin master
    )
    
fi