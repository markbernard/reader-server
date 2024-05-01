import { Client } from "pg";
import * as dbconfig from "./dbconfig.json";
import { ReaderUserDao } from "./reader-user-dao";
import { SubscriptionDao } from "./subscription-dao";
import { UserSubscriptionDao } from "./user-subscription-dao";
import { SubscriptionEntryDao } from "./subscription-entry-dao";
import { UserSubscriptionEntryDao } from "./user-subscription-entry-dao";

export class ConnectionManager {
  static client: Client;

  static initialize(): void {
    this.client = new Client({
      user: dbconfig.user,
      password: dbconfig.password,
      host: dbconfig.host,
      port: dbconfig.port,
      database: dbconfig.database
    });
    this.client.connect();
  }

  static createTables(): void {
    console.log("Connected to PostgreSQL database");
    ReaderUserDao.createTable(this.client).subscribe({
      next: (result: boolean) => {
        if (result) {
          console.log("Table readeruser created.");
          SubscriptionDao.createTable(this.client).subscribe({
            next: (result: boolean) => {
              if (result) {
                console.log("Table subscription created.");
                UserSubscriptionDao.createTable(this.client).subscribe({
                  next: (result: boolean) => {
                    if (result) {
                      console.log("Table usersubscription created.");
                      SubscriptionEntryDao.createTable(this.client).subscribe({
                        next: (result: boolean) => {
                          if (result) {
                            console.log("Table subscriptionentry created.");
                            UserSubscriptionEntryDao.createTable(this.client).subscribe({
                              next: (result: boolean) => {
                                if (result) {
                                  console.log("Table usersubscriptionentry created.");
                                } else {
                                  console.log("There was a problem creating table usersubscriptionentry.");
                                }
                              },
                              error: (err) => {
                                console.error("An error occurred trying to create table usersubscriptionentry.", err);
                              }
                            });
                          } else {
                            console.log("There was a problem creating table subscriptionentry.");
                          }
                        },
                        error: (err) => {
                          console.error("An error occurred trying to create table subscriptionentry.", err);
                        }
                      });
                    } else {
                      console.log("There was a problem creating table usersubscription.");
                    }
                  },
                  error: (err) => {
                    console.error("An error occurred trying to create table usersubscription.", err);
                  }
                });
              } else {
                console.log("There was a problem creating table subscription.");
              }
            },
            error: (err) => {
              console.error("An error occurred trying to create table subscription.", err);
            }
          });
        } else {
          console.log("There was a problem creating table readeruser.");
        }
      },
      error: (err) => {
        console.error("An error occurred trying to create table readeruser.", err);
      }
    });
  }
}
