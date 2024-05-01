export class UserSubscription {
  constructor(public userId: number = 0, public subscriptionId: number = 0) {}

  copy(userSubscription: UserSubscription): void {
    this.userId = userSubscription.userId;
    this.subscriptionId = userSubscription.subscriptionId;
  }
}
