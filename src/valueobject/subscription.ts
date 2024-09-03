export class Subscription {
  constructor(public id: number = 0, public title: string = "", public feed: string = "", public link: string = "",
    public description: string = "", public rss: boolean = true, public favicon: string = "", public faviconVerified: boolean = false,
    public lastmodified: string = "", public etag: string = "", public cacheexpire: Date = null, public excessivenotfound: boolean = false,
    public nextupdate: Date = null) {}

  copy(subscription: Subscription): void {
    this.id = subscription.id;
    this.title = subscription.title;
    this.feed = subscription.feed;
    this.link = subscription.link;
    this.description = subscription.description;
    this.rss = subscription.rss;
    this.favicon = subscription.favicon;
    this.faviconVerified = subscription.faviconVerified;
    this.lastmodified = subscription.lastmodified;
    this.etag = subscription.lastmodified;
    this.cacheexpire = subscription.cacheexpire;
    this.excessivenotfound = subscription.excessivenotfound;
    this.nextupdate = subscription.nextupdate;
  }
}