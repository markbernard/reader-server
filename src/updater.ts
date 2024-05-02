import { ConnectionManager } from "./dao/connection-manager";
import { ReaderUtil } from "./reader-util";

const UPDATE_TIME: number = 3600000; //1 hour

function update(): void {
  console.log("Starting update");
  ConnectionManager.initialize();

  ReaderUtil.readAllFeeds();
  console.log("Update complete.");

  setTimeout(() => {
    update();
  }, UPDATE_TIME);
}

update();