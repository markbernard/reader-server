export class SubscriptionEntry {
  constructor(public id: number = 0, public subscriptionId: number = 0, public title: string = "", public author: string = "", public description: string = "",
    public link: string = "", public comments: string = "", public content: string = "", public pubDate: Date = new Date()) {}
  
  copy(subscriptionEntry: SubscriptionEntry): void {
    this.id = subscriptionEntry.id;
    this.subscriptionId = subscriptionEntry.subscriptionId;
    this.title = subscriptionEntry.title;
    this.author = subscriptionEntry.author;
    this.description = subscriptionEntry.description;
    this.link = subscriptionEntry.link;
    this.comments = subscriptionEntry.comments;
    this.content = subscriptionEntry.content;
    this.pubDate = subscriptionEntry.pubDate;
  }
}