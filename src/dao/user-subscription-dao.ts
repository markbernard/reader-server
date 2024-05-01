import { AsyncSubject, Observable } from "rxjs";
import { UserSubscription } from "../valueobject/user-subscription";
import { ConnectionManager } from "./connection-manager";
import { UserSubscriptionWrapper } from "../valueobject/user-subscription-wrapper";
import { ReaderUser } from "../valueobject/reader-user";
import { Subscription } from "../valueobject/subscription";

export class UserSubscriptionDao {
  create(userSubscription: UserSubscription): Observable<UserSubscription> {
    const asyncSubject: AsyncSubject<UserSubscription> = new AsyncSubject();
    const sql: string = "INSERT INTO usersubscription (user_id, subscription_id) VALUES ($1,$2)";
    const values: Array<number> = [userSubscription.userId, userSubscription.subscriptionId];

    (ConnectionManager.client.query(sql, values) as Promise<any>).then((result: any) => {
      if (result.rowCount == 1) {
        const newUserSubscription: UserSubscription = new UserSubscription();
        newUserSubscription.copy(userSubscription);
        asyncSubject.next(newUserSubscription);
        asyncSubject.complete();
      } else {
        asyncSubject.error("Could not create Subscription: " + userSubscription);
      }
    });

    return asyncSubject.asObservable();
  }

  findAllBySubscription(subscriptionId: number): Observable<Array<UserSubscription>> {
    const asyncSubject: AsyncSubject<Array<UserSubscription>> = new AsyncSubject();
    const sql: string = "SELECT * FROM usersubscription WHERE subscription_id=$1";
    const values: Array<number> = [subscriptionId];

    (ConnectionManager.client.query(sql, values) as Promise<any>).then((result: any) => {
      if (result.rowCount > 0) {
        const userSubscriptions: Array<UserSubscription> = [];
        result.rows.forEach((row) => {
          const newUserSubscription: UserSubscription = new UserSubscription(row.user_id, row.subscription_id);
          userSubscriptions.push(newUserSubscription);
        });
        asyncSubject.next(userSubscriptions);
        asyncSubject.complete();
      } else {
        asyncSubject.error("Could not find UserSubscription for subscription id: " + subscriptionId);
      }
    });

    return asyncSubject.asObservable();
  }

  findByUserIdAndFeedWrapper(userId: number, feedUrl: string): Observable<UserSubscriptionWrapper> {
    const asyncSubject: AsyncSubject<UserSubscriptionWrapper> = new AsyncSubject();
    const sql: string = "SELECT US.*,SUB.* FROM usersubscription AS US JOIN subscription AS SUB ON US.subscription_id=SUB.id WHERE US.user_id=$1 AND SUB.feed=$2";
    const values: Array<any> = [userId, feedUrl];

    (ConnectionManager.client.query(sql, values) as Promise<any>).then((result: any) => {
      let newUserSubscriptionWrapper: UserSubscriptionWrapper = null;
      if (result.rowCount == 1) {
        const row: any = result.rows[0];
        newUserSubscriptionWrapper = new UserSubscriptionWrapper(
          new ReaderUser(row.user_id, row.name, row.email, row.token, row.tokenExpiry, ""),
          new Subscription(row.subscription_id, row.title, row.feed, row.link, row.description, row.favicon, row.faviconVerified));
      }

      asyncSubject.next(newUserSubscriptionWrapper);
      asyncSubject.complete();
    });

    return asyncSubject.asObservable();
  }

  static createTable(client: any): Observable<boolean> {
    const sql: string = "CREATE TABLE IF NOT EXISTS usersubscription (" 
    + "user_id BIGINT,"
    + "subscription_id BIGINT,"
    + "FOREIGN KEY(user_id) REFERENCES readeruser(id),"
    + "FOREIGN KEY(subscription_id) REFERENCES subscription(id)"
    + ")";

    const promise: AsyncSubject<boolean> = new AsyncSubject<boolean>();;
      client.query(sql, (err: any, result: any) => {
        if (err != null) {
          promise.error(err);
        } else {
          promise.next(true);
        }
        promise.complete();
      });
    

    return promise.asObservable();
  }
}
