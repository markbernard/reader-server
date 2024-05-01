import { ConnectionManager } from "./dao/connection-manager";
import { ReaderUtil } from "./reader-util";

console.log("Starting update");
ConnectionManager.initialize();

ReaderUtil.readAllFeeds();
console.log("Update complete.");
