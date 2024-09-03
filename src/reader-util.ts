import https from "https";
import { ClientRequest, IncomingHttpHeaders, IncomingMessage } from "http";
import { Subscription } from "./valueobject/subscription";
import { JSDOM } from "jsdom";
import { SubscriptionDao } from "./dao/subscription-dao";
import { SubscriptionEntry } from "./valueobject/subscription-entry";
import { SubscriptionEntryDao } from "./dao/subscription-entry-dao";
import { UserSubscriptionDao } from "./dao/user-subscription-dao";
import { UserSubscription } from "./valueobject/user-subscription";
import { UserSubscriptionEntryDao } from "./dao/user-subscription-entry-dao";
import { UserSubscriptionEntry } from "./valueobject/user-subscription-entry";
import { AsyncSubject, Observable } from "rxjs";

export class ReaderUtil {
  public static readonly USER_AGENT: string = "Free Reader version 1.0";
  private static readonly SUBSCRIPTION_DAO: SubscriptionDao = new SubscriptionDao();
  private static readonly SUBSCRIPTION_ENTRY_DAO: SubscriptionEntryDao = new SubscriptionEntryDao();
  private static readonly USER_SUBSCRIPTION_DAO: UserSubscriptionDao = new UserSubscriptionDao();
  private static readonly USER_SUBSCRIPTION_ENTRY_DAO: UserSubscriptionEntryDao = new UserSubscriptionEntryDao();

  public static readAllFeeds(): void {
    this.SUBSCRIPTION_DAO.getAll().subscribe({
      next: (result: Array<Subscription>) => {
        result.forEach((subscription: Subscription) => {
          const now: number = Date.now();
          if (now >= subscription.nextupdate.getDate()) {
            console.log("Updating: " + subscription.title);
            this.getFeedData(subscription);
            if (!subscription.faviconVerified) {
              setTimeout(() => {
                this.checkFavorite(subscription);
              }, 1);
            }
          }
        });
      }
    });
  }

  public static getFeedData(subscription: Subscription): void {
    this.USER_SUBSCRIPTION_DAO.findAllBySubscription(subscription.id).subscribe({
      next: (result: Array<UserSubscription>) => {
        const feedUrl = subscription.feed;
        let data: string = "";
        const options: any = {
          headers: {
            "User-Agent": this.USER_AGENT
          }
        }
        if (subscription.lastmodified.trim().length > 0) {
          options.headers["If-Modified-Since"] = "" + subscription.lastmodified;
        }
        if (subscription.etag.trim().length > 0) {
          options.headers["If-None-Match"] = "" + subscription.etag;
        }
    
        https.get(feedUrl, options, (res: IncomingMessage) => {
          if (res.statusCode == 404) {
            subscription.excessivenotfound = true;
            console.log("Could not reach: " + feedUrl);
            console.log(res.statusCode + ": " + res.statusMessage);
            res.resume();
    
            return;
          } else if (res.statusCode != 200) {
            console.log("Could not reach: " + feedUrl);
            console.log(res.statusCode + ": " + res.statusMessage);
            res.resume();
    
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
              this.parseRss(rss, subscription.id, result);
            } else if (atom != null) {
              this.parseAtom(atom, subscription.id, result);
            }

            const headers: IncomingHttpHeaders = res.headers;
            let lastModified: string = headers["last-modified"];
            let etag: string = headers.etag;
            let cacheControl: string = headers["cache-control"];
            let maxAge: number = 0;
            let delta: number = 3600000; // 1 hour
            if (lastModified == undefined) {
              lastModified = "";
            }
            if (etag == undefined) {
              etag = "";
            }
            if (lastModified.length == 0 && etag.length == 0) {
              delta *= 24; // 24 hours
            }
            if (cacheControl == undefined) {
              cacheControl = "max-age=0";
            } else {
              const regex: RegExp = new RegExp("max-age=(\\d+).*");
              const regexResult: RegExpExecArray = regex.exec(cacheControl);
              if (regexResult != null && regexResult[1] != null) {
                maxAge = parseInt(regexResult[1]) * 1000;
              }
            }
            subscription.lastmodified = lastModified;
            subscription.etag = etag;
            subscription.cacheexpire = new Date(Date.now() + maxAge);
            subscription.nextupdate = new Date(Date.now() + delta);
            this.SUBSCRIPTION_DAO.update(subscription);
          });
        });
      }
    });
  }

  private static parseRss(doc: Element, subscriptionId: number, userSubscriptions: Array<UserSubscription>): void {
    const items: NodeListOf<HTMLElement> = doc.querySelectorAll("item");
    items.forEach((item: HTMLElement) => {
      const subscriptionEntry: SubscriptionEntry = new SubscriptionEntry();
      subscriptionEntry.subscriptionId = subscriptionId;
      item.childNodes.forEach((child: ChildNode) => {
        if (child.nodeName == "title") {
          subscriptionEntry.title = child.textContent;
        } else if (child.nodeName == "link") {
          subscriptionEntry.link = child.textContent;
        } else if (child.nodeName == "comments") {
          subscriptionEntry.comments = child.textContent;
        } else if (child.nodeName == "dc:creator") {
          subscriptionEntry.author = child.textContent;
        } else if (child.nodeName == "description") {
          subscriptionEntry.description = child.textContent;
        } else if (child.nodeName == "content:encoded") {
          subscriptionEntry.content = child.textContent;
        } else if (child.nodeName == "pubDate") {
          subscriptionEntry.pubDate = new Date(child.textContent);
        }
      });
      this.createSubscriptionEntry(subscriptionEntry, userSubscriptions);
    });
  }

  private static parseAtom(doc: Element, subscriptionId: number, userSubscriptions: Array<UserSubscription>): void {
    const items: NodeListOf<HTMLElement> = doc.querySelectorAll("entry");
    items.forEach((item: HTMLElement) => {
      const subscriptionEntry: SubscriptionEntry = new SubscriptionEntry();
      subscriptionEntry.subscriptionId = subscriptionId;
      item.childNodes.forEach((child: HTMLElement) => {
        if (child.nodeName == "title") {
          subscriptionEntry.title = child.textContent;
        } else if (child.nodeName == "link" && child.getAttribute("type") == "text/html") {
          subscriptionEntry.link = child.getAttribute("href");
        } else if (child.nodeName == "author") {
          subscriptionEntry.author = child.querySelector("name").textContent;
        } else if (child.nodeName == "content") {
          subscriptionEntry.content = child.textContent;
        } else if (child.nodeName == "published") {
          subscriptionEntry.pubDate = new Date(child.textContent);
        }
      });
      this.createSubscriptionEntry(subscriptionEntry, userSubscriptions);
    });
  }

  private static createSubscriptionEntry(subscriptionEntry: SubscriptionEntry, userSubscriptions: Array<UserSubscription>): void {
    this.SUBSCRIPTION_ENTRY_DAO.findByLink(subscriptionEntry.link).subscribe({
      next: (result: SubscriptionEntry) => {
        if (result == null) {
          this.SUBSCRIPTION_ENTRY_DAO.create(subscriptionEntry).subscribe({
            next: (result: SubscriptionEntry) => {
              userSubscriptions.forEach((userSubscription: UserSubscription) => {
                this.USER_SUBSCRIPTION_ENTRY_DAO.create(new UserSubscriptionEntry(userSubscription.userId, result.id, false)).subscribe({ next: () => {} });
              });
            }
          });
        }
      }
    });
  }

  public static checkFavorite(subscription: Subscription): void {
    if (subscription.favicon.length > 0) {
      this.checkIconUrl(subscription.favicon).subscribe({
        next: (result: boolean) => {
          if (result) {
            subscription.faviconVerified = true;
            this.SUBSCRIPTION_DAO.update(subscription).subscribe({ next: () => {} });
          } else {
            this.findIcon(subscription);
          }
        }
      });
    } else {
      this.findIcon(subscription);
    }
  }

  private static findIcon(subscription: Subscription): void {
    let data: string = "";
    
    https.get(subscription.link, (res: IncomingMessage) => {
      if (res.statusCode != 200) {
        console.log("Could not reach: " + subscription.link);
        console.log(res.statusCode + ": " + res.statusMessage);
        res.resume();

        return;
      }

      res.on("data", (chunk: string) => {
        data += chunk;
      });

      res.on("close", () => {
        const dom: JSDOM = new JSDOM(data, {contentType: "text/html"});
        let icon: Element = dom.window.document.querySelector("link[type='image/x-icon']");
        let favicon: string = "";

        if (icon != null) {
          favicon = icon.getAttribute("href");
        } else {
          icon = dom.window.document.querySelector("link[rel='shortcut icon']");
          if (icon != null) {
            favicon = icon.getAttribute("href");
          } else {
            icon = dom.window.document.querySelector("link[rel='icon']");
            if (icon != null) {
              favicon = icon.getAttribute("href");
            } else {
              favicon = "/favicon.ico";
            }
          }
        }

        if (!favicon.startsWith("http")) {
          const url: URL = new URL(subscription.link);
          if (favicon.startsWith("/")) {
            favicon = url.origin + favicon;
          } else {
            favicon = url.origin + "/" + favicon;
          }
        }
        favicon = favicon.replace("http:", "https:");
  
        this.checkIconUrl(favicon).subscribe({
          next: (iconResult: boolean) => {
            if (iconResult) {
              subscription.favicon = favicon;
              subscription.faviconVerified = true;
              this.SUBSCRIPTION_DAO.update(subscription).subscribe({ next: () => {} });
            }
          }
        });
      });
    });
  }

  private static checkIconUrl(faviconUrl: string): Observable<boolean> {
    const asyncSubject: AsyncSubject<boolean> = new AsyncSubject();

    https.get(faviconUrl, (res: IncomingMessage) => {
      if (res.statusCode == 200) {
        asyncSubject.next(true);
        asyncSubject.complete();
      } else {
        console.log("Could not reach: " + faviconUrl);
        res.resume();

        asyncSubject.next(false);
        asyncSubject.complete();
      }

      return;
    });

    return asyncSubject.asObservable();
  }
}