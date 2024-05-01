export class Subscription {
  constructor(public id: number = 0, public title: string = "", public feed: string = "", public link: string = "",
    public description: string = "", public rss: boolean = true, public favicon: string = "", public faviconVerified: boolean = false) {}

  copy(subscription: Subscription): void {
    this.id = subscription.id;
    this.title = subscription.title;
    this.feed = subscription.feed;
    this.link = subscription.link;
    this.description = subscription.description;
    this.rss = subscription.rss;
    this.favicon = subscription.favicon;
    this.faviconVerified = subscription.faviconVerified;
  }
}