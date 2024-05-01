import { AsyncSubject, Observable } from "rxjs";
import { UserSubscriptionEntry } from "../valueobject/user-subscription-entry";
import { ConnectionManager } from "./connection-manager";
import { UserSubscriptionEntryWrapper } from "../valueobject/user-subscription-entry-wrapper";
import { SubscriptionEntry } from "../valueobject/subscription-entry";

export class UserSubscriptionEntryDao {
  create(userSubscriptionEntry: UserSubscriptionEntry): Observable<UserSubscriptionEntry> {
    const asyncSubject: AsyncSubject<UserSubscriptionEntry> = new AsyncSubject();
    const sql: string = "INSERT INTO usersubscriptionentry (userid, subscriptionentryid, read) VALUES ($1,$2,$3)";
    const values: Array<any> = [userSubscriptionEntry.userId, userSubscriptionEntry.subscriptionEntryId, userSubscriptionEntry.read];

    (ConnectionManager.client.query(sql, values) as Promise<any>).then((result: any) => {
        if (result.rowCount == 1) {
          asyncSubject.next(userSubscriptionEntry);
        } else {
          asyncSubject.next(null);
        }
        asyncSubject.complete();
    });
  
    return asyncSubject.asObservable();
  }

  findByUserId(userId: number, subscriptionId: number, includeRead: boolean, newestFirst: boolean, pageSize: number, page: number): Observable<Array<UserSubscriptionEntryWrapper>> {
    const asyncSubject: AsyncSubject<Array<UserSubscriptionEntryWrapper>> = new AsyncSubject();
    const sql: string = "SELECT se.id,se.subscriptionid,se.title,se.author,se.description,se.link,se.comments,se.content,se.pubdate,use.userid,use.read FROM subscriptionentry AS se " 
      + "JOIN usersubscriptionentry AS use ON se.id=use.subscriptionentryid "
      + "JOIN usersubscription AS us ON us.subscription_id=se.subscriptionid "
      + "WHERE us.user_id=$1 AND us.subscription_id=$2 "
      + (includeRead ? "" : "AND use.read=false ")
      + "ORDER BY se.pubdate " + (newestFirst ? "ASC " : "DESC ")
      + "LIMIT " + pageSize + " OFFSET " + (page * pageSize);
    const values: Array<any> = [userId, subscriptionId];
    const userSubscriptionEntries: Array<UserSubscriptionEntryWrapper> = [];

    (ConnectionManager.client.query(sql, values) as Promise<any>).then((result: any) => {
      if (result.rowCount > 0) {
        result.rows.forEach((row: any) => {
          userSubscriptionEntries.push(new UserSubscriptionEntryWrapper(row.userid, new SubscriptionEntry(row.id, row.subscriptionid, row.title, row.author,
            row.description, row.link, row.comments, row.content, row.pubdate), row.read));
        });
      }
      asyncSubject.next(userSubscriptionEntries);
      asyncSubject.complete();
    });
  
    return asyncSubject.asObservable();
  }

  getCounts(userId: number): Observable<Map<string, number>> {
    const asyncSubject: AsyncSubject<Map<string, number>> = new AsyncSubject();
    const sql: string = "SELECT se.subscriptionid,s.feed,COUNT(*) AS num "
      + "FROM subscriptionentry AS se "
      + "JOIN usersubscription AS us ON us.subscription_id=se.subscriptionid "
      + "JOIN subscription AS s ON s.id=se.subscriptionid "
      + "JOIN usersubscriptionentry AS use ON use.subscriptionentryid=se.id "
      + "WHERE us.user_id=$1 AND use.read=false "
      + "GROUP BY se.subscriptionid,s.feed";
    const values: Array<any> = [userId];
    const userSubscriptionCounts: Map<string, number> = new Map();

    (ConnectionManager.client.query(sql, values) as Promise<any>).then((result: any) => {
      if (result.rowCount > 0) {
        result.rows.forEach((row: any) => {
          userSubscriptionCounts.set(row.feed, row.num);
        });
        asyncSubject.next(userSubscriptionCounts);
        asyncSubject.complete();
      } else {
        asyncSubject.error("Could not get counts for userId: " + userId);
      }
    });
  
    return asyncSubject.asObservable();
  }

  markRead(userId: number, subscriptionEntryId: number, read: boolean): Observable<boolean> {
    const asyncSubject: AsyncSubject<boolean> = new AsyncSubject();
    const sql: string = "UPDATE usersubscriptionentry SET read=$1 WHERE userid=$2 AND subscriptionentryid=$3";
    const values: Array<any> = [read, userId, subscriptionEntryId];

    (ConnectionManager.client.query(sql, values) as Promise<any>).then((result: any) => {
      if (result.rowCount == 1) {
        asyncSubject.next(true);
      } else {
        asyncSubject.next(false);
      }
      asyncSubject.complete();
    });
  
    return asyncSubject.asObservable();
  }

  markAllRead(userId: number, subscriptionId: number): Observable<boolean> {
    const asyncSubject: AsyncSubject<boolean> = new AsyncSubject();
    const sql: string = "UPDATE usersubscriptionentry AS use SET read=true FROM subscriptionentry AS se " 
      + "WHERE use.subscriptionentryid=se.id AND use.userid=$1 AND se.subscriptionid=$2";
    const values: Array<any> = [userId, subscriptionId];

    (ConnectionManager.client.query(sql, values) as Promise<any>).then((result: any) => {
      if (result.rowCount > 0) {
        asyncSubject.next(true);
      } else {
        asyncSubject.next(false);
      }
      asyncSubject.complete();
    });
  
    return asyncSubject.asObservable();
  }

  static createTable(client: any): Observable<boolean> {
    const sql: string = "CREATE TABLE IF NOT EXISTS usersubscriptionentry (" 
      + "userid BIGINT,"
      + "subscriptionentryid BIGINT,"
      + "read BOOLEAN,"
      + "FOREIGN KEY(subscriptionentryid) REFERENCES subscriptionentry(id),"
      + "FOREIGN KEY(userid) REFERENCES readeruser(id)"
      + ")";

    const asyncSubject: AsyncSubject<boolean> = new AsyncSubject<boolean>();
      client.query(sql, (err: any, result: any) => {
        if (err != null) {
          asyncSubject.error(err);
        } else {
          asyncSubject.next(true);
        }
        asyncSubject.complete();
      });
    

    return asyncSubject.asObservable();
  }
}
