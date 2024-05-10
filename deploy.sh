echo "Building server"
npx tsc
echo "Server build complete"

echo "Stopping server"
systemctl stop reader-server
systemctl stop reader-updater

echo "Copying files to /usr/local/bin/reader-server/"
cd dist
cp -rf * /usr/local/bin/reader-server/
echo "Copy complete"

echo "Starting server"
systemctl start reader-server
systemctl start reader-updater
