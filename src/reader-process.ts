import { AsyncSubject, Observable } from "rxjs";
import { ReaderUser } from "./valueobject/reader-user";
import { ReaderUserDao } from "./dao/reader-user-dao";
import { TokenGenerator } from "./token-generator";
import { Subscription } from "./valueobject/subscription";
import https from "https";
import { IncomingMessage } from "http";
import { JSDOM } from "jsdom";
import { SubscriptionDao } from "./dao/subscription-dao";
import { UserSubscriptionDao } from "./dao/user-subscription-dao";
import { UserSubscription } from "./valueobject/user-subscription";
import { UserSubscriptionWrapper } from "./valueobject/user-subscription-wrapper";
import { ReaderUtil } from "./reader-util";
import { SubscriptionEntry } from "./valueobject/subscription-entry";
import { SubscriptionEntryDao } from "./dao/subscription-entry-dao";
import { UserSubscriptionEntryDao } from "./dao/user-subscription-entry-dao";
import { UserSubscriptionEntryWrapper } from "./valueobject/user-subscription-entry-wrapper";

export class ReaderProcess {
  readonly READER_USER_DAO: ReaderUserDao = new ReaderUserDao();
  readonly SUBSCRIPTION_DAO: SubscriptionDao = new SubscriptionDao();
  readonly SUBSCRIPTION_ENTRY_DAO: SubscriptionEntryDao = new SubscriptionEntryDao();
  readonly USER_SUBSCRIPTION_DAO: UserSubscriptionDao = new UserSubscriptionDao();
  readonly USER_SUBSCRIPTION_ENTRY_DAO: UserSubscriptionEntryDao = new UserSubscriptionEntryDao();
  register(readerUser: ReaderUser): Observable<ReaderUser> {
    const asyncSubject: AsyncSubject<ReaderUser> = new AsyncSubject();

    this.READER_USER_DAO.create(readerUser).subscribe({
      next: (result: ReaderUser) => {
        asyncSubject.next(result);
        asyncSubject.complete();
      },
      error: (err: any) => {
        asyncSubject.error("Could not create ReaderUser: " + readerUser.toString() + "\n" + err);
        asyncSubject.complete();
      }
    });

    return asyncSubject.asObservable();
  }

  login(readerUser: ReaderUser): Observable<ReaderUser> {
    const asyncSubject: AsyncSubject<ReaderUser> = new AsyncSubject();

    this.READER_USER_DAO.findByEmailAndPassword(readerUser.email, readerUser.password).subscribe({
      next: (result: ReaderUser) => {
        const token: string = TokenGenerator.generateToken();
        const tokenExpiry: Date = this.getExpiryDate();
        result.token = token;
        result.tokenExpiry = tokenExpiry;
        this.READER_USER_DAO.updateToken(result).subscribe({
          next: (result: ReaderUser) => {
            result.password = "";
            asyncSubject.next(result);
            asyncSubject.complete();
          },
          error: (err: any) => {
            asyncSubject.error("Could not create ReaderUser: " + readerUser.toString() + "\n" + err);
            asyncSubject.complete();
          }
        });
      },
      error: (err: any) => {
        asyncSubject.error("Could not create ReaderUser: " + readerUser.toString() + "\n" + err);
        asyncSubject.complete();
      }
    });

    return asyncSubject.asObservable();
  }

  loginWithToken(token: string): Observable<ReaderUser> {
    const asyncSubject: AsyncSubject<ReaderUser> = new AsyncSubject();

    this.READER_USER_DAO.findByToken(token).subscribe({
      next: (result: ReaderUser) => {
        if (result != null) {
          this.READER_USER_DAO.updateToken(result).subscribe({
            next: (result: ReaderUser) => {
              asyncSubject.next(result);
              asyncSubject.complete();
            },
            error: (err: any) => {
              asyncSubject.error("Could not login with token: " + token + "\n" + err);
            }
          });
        } else {
          asyncSubject.next(result);
          asyncSubject.complete();
        }
      },
      error: (err: any) => {
        asyncSubject.error("Could not login with token: " + token + "\n" + err);
      }
    });

    return asyncSubject.asObservable();
  }

  subscribe(feedUrl: string, token: string): Observable<Subscription> {
    const asyncSubject: AsyncSubject<Subscription> = new AsyncSubject();

    this.READER_USER_DAO.findByToken(token).subscribe({
      next: (readerUser: ReaderUser) => {
        this.USER_SUBSCRIPTION_DAO.findByUserIdAndFeedWrapper(readerUser.id, feedUrl).subscribe({
          next: (result: UserSubscriptionWrapper) => {
            if (result != null) {
              asyncSubject.next(result.subscription);
              asyncSubject.complete();
            } else {
              this.SUBSCRIPTION_DAO.findByFeed(feedUrl).subscribe({
                next: (result: Subscription) => {
                  let subscription: Subscription = result;
                  if (subscription != null) {
                    this.createUserSubscription(subscription, readerUser, asyncSubject);
                  } else {
                    if (readerUser != null) {
                      if (feedUrl.startsWith("http:")) {
                        feedUrl = feedUrl.replace("http:", "https:");
                      }
                      let data: string = "";

                      https.get(feedUrl, (res: IncomingMessage) => {
                        if (res.statusCode != 200) {
                          console.log("Could not reach: " + feedUrl);
                          res.resume();
                  
                          asyncSubject.error("Could not load: " + feedUrl);
                  
                          return;
                        }
                  
                        res.on("data", (chunk: string) => {
                          data += chunk;
                        });
                  
                        res.on("close", () => {
                          const dom: JSDOM = new JSDOM(data, {contentType: "text/xml"});
                          const rss: Element = dom.window.document.querySelector("rss");
                          const atom: Element = dom.window.document.querySelector("feed");
                          if (rss != null) {
                            subscription = this.parseRss(rss, feedUrl);
                          } else if (atom != null) {
                            subscription = this.parseAtom(atom, feedUrl);
                          }
                          
                          this.createUserSubscription(subscription, readerUser, asyncSubject);
                        });
                      });
                    } else {
                      asyncSubject.error("Invalid token provided.");
                      asyncSubject.complete();
                    }
                  }
                }
              });
            }
          }
        });
      }
    });

    return asyncSubject.asObservable();
  }

  getEntries(suscriptionId: number, includeRead: boolean, newestFirst: boolean, pageSize: number, page: number, token: string): Observable<Array<UserSubscriptionEntryWrapper>> {
    const asyncSubject: AsyncSubject<Array<UserSubscriptionEntryWrapper>> = new AsyncSubject();

    this.READER_USER_DAO.findByToken(token).subscribe({
      next: (readerUser: ReaderUser) => {
        this.USER_SUBSCRIPTION_ENTRY_DAO.findByUserId(readerUser.id, suscriptionId, includeRead, newestFirst, pageSize, page).subscribe({
          next: (result: Array<UserSubscriptionEntryWrapper>) => {
            asyncSubject.next(result);
            asyncSubject.complete();
          }
        })
      }
    });

    return asyncSubject.asObservable();
  }

  getSubscriptions(token: string): Observable<Array<Subscription>> {
    const asyncSubject: AsyncSubject<Array<Subscription>> = new AsyncSubject();

    this.READER_USER_DAO.findByToken(token).subscribe({
      next: (readerUser: ReaderUser) => {
        this.SUBSCRIPTION_DAO.findByUserId(readerUser.id).subscribe({
          next: (result: Array<Subscription>) => {
            asyncSubject.next(result);
            asyncSubject.complete();
          }
        })
      }
    });

    return asyncSubject.asObservable();
  }

  getCounts(token: string): Observable<Map<string, number>> {
    const asyncSubject: AsyncSubject<Map<string, number>> = new AsyncSubject();

    this.READER_USER_DAO.findByToken(token).subscribe({
      next: (readerUser: ReaderUser) => {
        this.USER_SUBSCRIPTION_ENTRY_DAO.getCounts(readerUser.id).subscribe({
          next: (result: Map<string, number>) => {
            asyncSubject.next(result);
            asyncSubject.complete();
          }
        })
      }
    });

    return asyncSubject.asObservable();
  }

  markRead(token: string, subscriptionEntryId: number, read: boolean): Observable<boolean> {
    const asyncSubject: AsyncSubject<boolean> = new AsyncSubject();

    this.READER_USER_DAO.findByToken(token).subscribe({
      next: (readerUser: ReaderUser) => {
        this.USER_SUBSCRIPTION_ENTRY_DAO.markRead(readerUser.id, subscriptionEntryId, read).subscribe({
          next: (result: boolean) => {
            asyncSubject.next(result);
            asyncSubject.complete();
          }
        })
      }
    });

    return asyncSubject.asObservable();
  }

  markAllRead(token: string, subscriptionId: number): Observable<boolean> {
    const asyncSubject: AsyncSubject<boolean> = new AsyncSubject();

    this.READER_USER_DAO.findByToken(token).subscribe({
      next: (readerUser: ReaderUser) => {
        this.USER_SUBSCRIPTION_ENTRY_DAO.markAllRead(readerUser.id, subscriptionId).subscribe({
          next: (result: boolean) => {
            asyncSubject.next(result);
            asyncSubject.complete();
          }
        })
      }
    });

    return asyncSubject.asObservable();
  }

  private createUserSubscription(subscription: Subscription, readerUser: ReaderUser, asyncSubject: AsyncSubject<Subscription>): void {
    this.SUBSCRIPTION_DAO.create(subscription).subscribe({
      next: (result: Subscription) => {
        if (result != null) {
          subscription = result;
          const userSubscription: UserSubscription = new UserSubscription(readerUser.id, subscription.id);
          this.USER_SUBSCRIPTION_DAO.create(userSubscription).subscribe({
            next: (result: UserSubscription) => {
              asyncSubject.next(subscription);
              asyncSubject.complete();
              ReaderUtil.getFeedData(subscription);
            },
            error: (err: any) => {
              asyncSubject.error("Could not create user subscription: " + err);
              asyncSubject.complete();
            }
          });
        } else {
          asyncSubject.error("Could not create subscription");
          asyncSubject.complete();
        }
      },
      error: (err: any) => {
        asyncSubject.error("Could not create subscription: " + err);
        asyncSubject.complete();
      }
    });
  }

  private parseRss(doc: Element, feed: string): Subscription {
    const channel: Element = doc.querySelector("channel");
    const title: string = channel.querySelector("title").textContent;
    let link: string = channel.querySelector("link").textContent;
    const description: string = channel.querySelector("description").textContent;
    let favicon: string = "";
    const image: Element = channel.querySelector("image");
    if (image != null) {
      favicon = image.querySelector("url").textContent;
    }
    link = link.replace("http:", "https:");
    
    return new Subscription(0, title, feed, link, description, true, favicon);
  }

  private parseAtom(doc: Element, feed: string): Subscription {
    const title: string = doc.querySelector("title").textContent;
    const linkElement: HTMLElement = doc.querySelector("link[type='text/html']");
    let link: string = linkElement.getAttribute("href");
    const description: string = doc.querySelector("subtitle").textContent;
    link = link.replace("http:", "https:");
    
    return new Subscription(0, title, feed, link, description, false);
  }

  private getExpiryDate(): Date {
    let result: Date = new Date();
    result = new Date(result.getFullYear(), result.getMonth(), result.getDate() + 7, result.getHours(), result.getMinutes(), result.getSeconds());

    return result;
  }
}
