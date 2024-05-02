# Reader Server
Simple RSS server to support the [Free Reader](https://github.com/markbernard/reader) RSS web client.

You will need to set up a connection to your database. In the src/dao folder copy dbconfig.json.template to dbconfig.json. Change the values for your database. Currently on Postgres is supported. The dbconfig.json is in the ignore list so it can't be committed. The first run of app.js will create all the tables in the database.

You can build a .deb package by cloning the repository a then run build.sh.

If you install with the deb package 2 systemd services will be installed and started. 

 - reader-server.service - is the main rest server to feed data to the front end
 - reader-updater.service - runs 1 per hour to get the latest feeds for all subscriptions
