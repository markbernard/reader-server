import express = require("express");
import { Express } from "express";
import { ReaderController } from "./reader-controller";
import { ConnectionManager } from "./dao/connection-manager";

const PREFIX: string = "/readerws";
const app: Express = express();
app.use(express.json());

const PORT = 3000;

ConnectionManager.initialize();
ConnectionManager.createTables();

try {
  app.listen(PORT, () => {
    console.log("Server listening on port: ", PORT);
  });
  
  
  const readerController = new ReaderController();
  app.post(PREFIX + "/getCounts", (request, response) => { readerController.getCounts(request, response); });
  app.post(PREFIX + "/getEntries", (request, response) => { readerController.getEntries(request, response); });
  app.post(PREFIX + "/getSubscriptions", (request, response) => { readerController.getSubscriptions(request, response); });
  app.post(PREFIX + "/login", (request, response) => { readerController.login(request, response); });
  app.post(PREFIX + "/loginWithToken", (request, response) => { readerController.loginWithToken(request, response); });
  app.post(PREFIX + "/register", (request, response) => { readerController.register(request, response); });
  app.post(PREFIX + "/subscribe", (request, response) => { readerController.subscribe(request, response); });
  app.post(PREFIX + "/markRead", (request, response) => { readerController.markRead(request, response); });
  app.post(PREFIX + "/markAllRead", (request, response) => { readerController.markAllRead(request, response); });
} catch (e) {
  console.log(e);
}