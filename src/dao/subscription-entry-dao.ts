import { AsyncSubject, Observable } from "rxjs";
import { SubscriptionEntry } from "../valueobject/subscription-entry";
import { ConnectionManager } from "./connection-manager";

export class SubscriptionEntryDao {
  create(subscriptionEntry: SubscriptionEntry): Observable<SubscriptionEntry> {
    const asyncSubject: AsyncSubject<SubscriptionEntry> = new AsyncSubject();
    const sql: string = "INSERT INTO subscriptionentry (title, subscriptionid, author, description, link, comments, content, pubdate) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id";
    const values: Array<any> = [subscriptionEntry.title, subscriptionEntry.subscriptionId, subscriptionEntry.author, subscriptionEntry.description, subscriptionEntry.link, 
      subscriptionEntry.comments, subscriptionEntry.content, subscriptionEntry.pubDate];

    (ConnectionManager.client.query(sql, values) as Promise<any>).then((result: any) => {
      if (result.rowCount == 1) {
        const newSubscriptionEntry: SubscriptionEntry = new SubscriptionEntry();
        newSubscriptionEntry.copy(newSubscriptionEntry);
        newSubscriptionEntry.id = result.rows[0].id;
        asyncSubject.next(newSubscriptionEntry);
        asyncSubject.complete();
      } else {
        asyncSubject.error("Could not create SubscriptionEntry: " + subscriptionEntry);
      }
    });
  
    return asyncSubject.asObservable();
  }

  findByLink(link: string): Observable<SubscriptionEntry> {
    const asyncSubject: AsyncSubject<SubscriptionEntry> = new AsyncSubject();
    const sql: string = "SELECT * FROM subscriptionentry WHERE link=$1";
    const values: Array<any> = [link];

    (ConnectionManager.client.query(sql, values) as Promise<any>).then((result: any) => {
      let newSubscriptionEntry: SubscriptionEntry = null;
      if (result.rowCount == 1) {
        newSubscriptionEntry = new SubscriptionEntry(result.rows[0].id, result.rows[0].subscriptionId, result.rows[0].title, 
          result.rows[0].author, result.rows[0].description, result.rows[0].link, result.rows[0].comments, result.rows[0].content, result.rows[0].pubdate);
      }
      asyncSubject.next(newSubscriptionEntry);
      asyncSubject.complete();
  });
  
    return asyncSubject.asObservable();
  }

  static createTable(client: any): Observable<boolean> {
    const sql: string = "CREATE TABLE IF NOT EXISTS subscriptionentry (" 
      + "id SERIAL PRIMARY KEY,"
      + "subscriptionid BIGINT,"
      + "title TEXT NOT NULL,"
      + "author TEXT,"
      + "description TEXT,"
      + "link TEXT UNIQUE,"
      + "comments TEXT,"
      + "content TEXT,"
      + "pubdate TIMESTAMP,"
      + "FOREIGN KEY(subscriptionid) REFERENCES subscription(id)"
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
