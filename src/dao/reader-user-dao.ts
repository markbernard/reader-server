import { AsyncSubject, Observable } from "rxjs";
import { ConnectionManager } from "./connection-manager";
import { ReaderUser } from "../valueobject/reader-user";
import { TokenGenerator } from "../token-generator";

export class ReaderUserDao {
  connectionManager: ConnectionManager = new ConnectionManager();

  create(readerUser: ReaderUser): Observable<ReaderUser> {
    const asyncSubject: AsyncSubject<ReaderUser> = new AsyncSubject();
    const sql: string = "INSERT INTO readeruser (name, email, password) VALUES ($1,$2,$3) RETURNING id";
    const values: Array<any> = [readerUser.name, readerUser.email, readerUser.password];

    (ConnectionManager.client.query(sql, values) as Promise<any>).then((result: any) => {
      if (result.rowCount == 1) {
        const newReaderUser: ReaderUser = new ReaderUser();
        newReaderUser.copy(readerUser);
        newReaderUser.id = result.rows[0].id;
        asyncSubject.next(newReaderUser);
      } else {
        asyncSubject.error("Could not create ReaderUser: " + readerUser);
      }
      asyncSubject.complete();
    }).catch((reason: any) => {
      asyncSubject.error("Could not create ReaderUser: " + reason);
    });

    return asyncSubject.asObservable();
  }

  findByEmailAndPassword(email: string, password: string): Observable<ReaderUser> {
    const asyncSubject: AsyncSubject<ReaderUser> = new AsyncSubject();
    const sql: string = "SELECT * FROM readeruser WHERE email=$1 AND password=$2";
    const values: Array<string> = [email, password];

    (ConnectionManager.client.query(sql, values) as Promise<any>).then((result: any) => {
      if (result.rowCount == 1) {
        const readerUser: ReaderUser = new ReaderUser(result.rows[0].id, result.rows[0].name, result.rows[0].email, null, null, result.rows[0].password);
        asyncSubject.next(readerUser);
      } else {
        asyncSubject.error("Could not login for: " + email);
      }
      asyncSubject.complete();
    }).catch((reason: any) => {
      asyncSubject.error("Could not login: " + reason);
    });

    return asyncSubject.asObservable();
  }

  updateToken(readerUser: ReaderUser): Observable<ReaderUser> {
    const asyncSubject: AsyncSubject<ReaderUser> = new AsyncSubject();
    const sql: string = "UPDATE readeruser SET token=$1,tokenExpiry=TO_TIMESTAMP($2, 'YYYY-MM-dd HH24:MI:SS') WHERE email=$3 AND password=$4";
    const values: Array<any> = [readerUser.token, this.getFormattedDate(readerUser.tokenExpiry), readerUser.email, readerUser.password];

    (ConnectionManager.client.query(sql, values) as Promise<any>).then((result: any) => {
      if (result.rowCount == 1) {
        const newReaderUser: ReaderUser = new ReaderUser();
        newReaderUser.copy(readerUser);
        newReaderUser.password = "";
        asyncSubject.next(newReaderUser);
      } else {
        asyncSubject.error("Could not update token for: " + readerUser);
      }
      asyncSubject.complete();
    }).catch((reason: any) => {
      asyncSubject.error("Could not update token: " + reason);
    });

    return asyncSubject.asObservable();
  }

  findByToken(token: string): Observable<ReaderUser> {
    const asyncSubject: AsyncSubject<ReaderUser> = new AsyncSubject();
    const sql: string = "SELECT * FROM readeruser WHERE token=$1";
    const values: Array<string> = [token];

    (ConnectionManager.client.query(sql, values) as Promise<any>).then((result: any) => {
      let readerUser: ReaderUser = null;
      if (result.rowCount == 1) {
        const tokenExpiry: Date = result.rows[0].tokenexpiry;
        if (tokenExpiry.getTime() > Date.now()) {
          readerUser = new ReaderUser(result.rows[0].id, result.rows[0].name, result.rows[0].email, result.rows[0].token, tokenExpiry, result.rows[0].password);
        }
      }
      asyncSubject.next(readerUser);
      asyncSubject.complete();
    }).catch((reason: any) => {
      asyncSubject.error("Could not login: " + reason);
    });

    return asyncSubject.asObservable();
  }

  getFormattedDate(date: Date): string {
    const month: string = "0" + (date.getMonth() + 1);
    const dayOfMonth: string = "0" + date.getDate();
    const hours: string = "0" + date.getHours();
    const minutes: string = "0" + date.getMinutes();
    const seconds: string = "0" + date.getSeconds();

    return date.getFullYear() + "-"
      + month.substring(month.length - 2, month.length) + "-"
      + dayOfMonth.substring(dayOfMonth.length - 2, dayOfMonth.length) + " "
      + hours.substring(hours.length - 2, hours.length) + ":"
      + minutes.substring(minutes.length - 2, minutes.length) + ":"
      + seconds.substring(seconds.length - 2, seconds.length);
  }

  static createTable(client: any): Observable<boolean> {
    const sql: string = "CREATE TABLE IF NOT EXISTS readeruser (" 
      + "id SERIAL PRIMARY KEY,"
      + "name TEXT NOT NULL,"
      + "email TEXT UNIQUE NOT NULL,"
      + "password TEXT NOT NULL,"
      + "token TEXT,"
      + "tokenexpiry TIMESTAMP"
      + ")";

    const asyncSubject: AsyncSubject<boolean> = new AsyncSubject<boolean>();;
      client.query(sql, (err: any, result: any) => {
        if (err != null) {
          asyncSubject.error(err);
        } else {
          asyncSubject.next(true);//
        }
        asyncSubject.complete();
      });
    

    return asyncSubject.asObservable();
  }
}