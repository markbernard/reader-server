import { ReaderUser } from "./reader-user";
import { Subscription } from "./subscription";

export class UserSubscriptionWrapper {
  constructor(public readerUser: ReaderUser, public subscription: Subscription) {}
}