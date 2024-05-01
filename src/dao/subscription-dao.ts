import { AsyncSubject, Observable } from "rxjs";
import { Subscription } from "../valueobject/subscription";
import { ConnectionManager } from "./connection-manager";

export class SubscriptionDao {
  create(subscription: Subscription): Observable<Subscription> {
    const asyncSubject: AsyncSubject<Subscription> = new AsyncSubject();
    const sql: string = "INSERT INTO subscription (title, feed, link, description, rss, favicon, faviconverified) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id";
    const values: Array<any> = [subscription.title, subscription.feed, subscription.link, subscription.description, subscription.rss, subscription.favicon, subscription.faviconVerified];

    (ConnectionManager.client.query(sql, values) as Promise<any>).then((result: any) => {
      if (result.rowCount == 1) {
        const newSubscription: Subscription = new Subscription();
        newSubscription.copy(subscription);
        newSubscription.id = result.rows[0].id;
        asyncSubject.next(newSubscription);
        asyncSubject.complete();
      } else {
        asyncSubject.error("Could not create Subscription: " + subscription);
      }
    }).catch((err) => {
      console.log("An error occurred trying to create Subscription: " + subscription + "\n" + err);
    });

    return asyncSubject.asObservable();
  }

  update(subscription: Subscription): Observable<Subscription> {
    const asyncSubject: AsyncSubject<Subscription> = new AsyncSubject();
    const sql: string = "UPDATE subscription SET title=$1, feed=$2, link=$3, description=$4, rss=$5, favicon=$6, faviconverified=$7 WHERE id=$8";
    const values: Array<any> = [subscription.title, subscription.feed, subscription.link, subscription.description, subscription.rss, 
      subscription.favicon, subscription.faviconVerified, subscription.id];

    (ConnectionManager.client.query(sql, values) as Promise<any>).then((result: any) => {
      if (result.rowCount == 1) {
        const newSubscription: Subscription = new Subscription();
        newSubscription.copy(subscription);
        asyncSubject.next(newSubscription);
        asyncSubject.complete();
      } else {
        asyncSubject.error("Could not update Subscription: " + subscription);
      }
    }).catch((err) => {
      console.log("An error occurred trying to update Subscription: " + subscription + "\n" + err);
    });

    return asyncSubject.asObservable();
  }

  findByFeed(feedUrl: string): Observable<Subscription> {
    const asyncSubject: AsyncSubject<Subscription> = new AsyncSubject();
    const sql: string = "SELECT * FROM subscription WHERE feed=$1";
    const values: Array<any> = [feedUrl];

    (ConnectionManager.client.query(sql, values) as Promise<any>).then((result: any) => {
      let subscription: Subscription = null;
      if (result.rowCount == 1) {
        const row: any = result.rows[0];
        subscription = new Subscription(row.id, row.title, row.feed, row.link, row.description, row.rss, row.favicon, row.faviconVerified);
      }

      asyncSubject.next(subscription);
      asyncSubject.complete();
    }).catch((err) => {
      console.log("An error occurred trying to find Subscription by URL: " + feedUrl + "\n" + err);
    });

    return asyncSubject.asObservable();
  }

  findByUserId(userId: number): Observable<Array<Subscription>> {
    const asyncSubject: AsyncSubject<Array<Subscription>> = new AsyncSubject();
    const sql: string = "SELECT * FROM subscription AS s JOIN usersubscription AS us ON us.subscription_id=s.id WHERE us.user_id=$1 ORDER BY s.title";
    const values: Array<number> = [userId];

    (ConnectionManager.client.query(sql, values) as Promise<any>).then((result: any) => {
      const subscriptionList: Array<Subscription> = [];
      if (result.rowCount > 0) {
        result.rows.forEach((row: any) => {
          subscriptionList.push(new Subscription(row.id, row.title, row.feed, row.link, row.description, row.rss, row.favicon, row.faviconverified))
        });
      }

      asyncSubject.next(subscriptionList);
      asyncSubject.complete();
    }).catch((err) => {
      console.log("An error occurred trying to find Subscription by user id: " + userId + "\n" + err);
    });

    return asyncSubject.asObservable();
  }

  getAll(): Observable<Array<Subscription>> {
    const asyncSubject: AsyncSubject<Array<Subscription>> = new AsyncSubject();
    const sql: string = "SELECT * FROM subscription";

    (ConnectionManager.client.query(sql) as Promise<any>).then((result: any) => {
      const subscriptionList: Array<Subscription> = [];
      if (result.rowCount > 0) {
        result.rows.forEach((row: any) => {
          subscriptionList.push(new Subscription(row.id, row.title, row.feed, row.link, row.description, row.rss, row.favicon, row.faviconverified))
        });
      }

      asyncSubject.next(subscriptionList);
      asyncSubject.complete();
    }).catch((err) => {
      console.log("An error occurred trying to get all Subscription: " + err);
    });

    return asyncSubject.asObservable();
  }

  static createTable(client: any): Observable<boolean> {
    const sql: string = "CREATE TABLE IF NOT EXISTS subscription (" 
      + "id SERIAL PRIMARY KEY,"
      + "title TEXT NOT NULL,"
      + "feed TEXT UNIQUE NOT NULL,"
      + "link TEXT,"
      + "description TEXT,"
      + "rss BOOL,"
      + "favicon TEXT,"
      + "faviconverified BOOL"
      + ")";

    const asyncSubject: AsyncSubject<boolean> = new AsyncSubject<boolean>();;
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
