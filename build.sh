#!/bin/bash
# run as sudo to be able to update node_modules
NAME="reader-server"
VERSION="1.0"
REVISION="1"
ARCHITECTURE="all"
MAINTAINER="Mark Bernard <mark.a.bernard@gmail.com>"
DESCRIPTION="RSS server back end for Free Reader web client"
OUTPUT_FOLDER="${NAME}_${VERSION}-${REVISION}_${ARCHITECTURE}"
INSTALL_FOLDER="/usr/local/bin/${NAME}"
SYSTEM_FOLDER="/etc/systemd/system/"

echo "Checking Node_modules"
npm update

echo "Building server"
npx tsc
echo "Server build complete"

echo "Create folders"

mkdir deb > /dev/null 2>&1

cd deb

mkdir $OUTPUT_FOLDER > /dev/null 2>&1

cd $OUTPUT_FOLDER

rm -fr .$INSTALL_FOLDER > /dev/null 2>&1
mkdir -p .$INSTALL_FOLDER > /dev/null 2>&1
rm -fr .$SYSTEM_FOLDER > /dev/null 2>&1
mkdir -p .$SYSTEM_FOLDER > /dev/null 2>&1

echo "Copy files"
cp -r ../../dist/* .$INSTALL_FOLDER
cp ../../package.json .$INSTALL_FOLDER
cp ../../scripts/reader-server.service .$SYSTEM_FOLDER
cp ../../scripts/reader-updater.service .$SYSTEM_FOLDER

mkdir DEBIAN > /dev/null 2>&1

echo "Create control file"
echo "Package: ${NAME}" > DEBIAN/control
echo "Version: ${VERSION}" >> DEBIAN/control
echo "Architecture: ${ARCHITECTURE}" >> DEBIAN/control
echo "Maintainer: ${MAINTAINER}" >> DEBIAN/control
echo "Depends: nodejs (>= 21.7.3)" >> DEBIAN/control
echo "Description: ${DESCRIPTION}" >> DEBIAN/control

cp ../../scripts/postinst DEBIAN/
cp ../../scripts/prerm DEBIAN/

cd ..

dpkg-deb --build --root-owner-group "$OUTPUT_FOLDER"
