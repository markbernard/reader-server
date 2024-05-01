import { Request, Response } from "express";
import { ReaderUser } from "./valueobject/reader-user";
import { ReaderProcess } from "./reader-process";
import { ClientResult } from "./valueobject/client-result";

import crypto from "crypto";
import { Subscription } from "./valueobject/subscription";
import { SubscriptionEntry } from "./valueobject/subscription-entry";
import { UserSubscriptionEntryWrapper } from "./valueobject/user-subscription-entry-wrapper";

export class ReaderController {
  readonly READER_PROCESS: ReaderProcess = new ReaderProcess();

  register(request: Request, response: Response): void {
    const clientResult: ClientResult = new ClientResult();
    let readerUser: ReaderUser = new ReaderUser(0, request.body.name, request.body.email, null, null, this.ecryptPassword(request.body.password));

    this.READER_PROCESS.register(readerUser).subscribe({
      next: (result: ReaderUser) => {
        if (result != null) {
          clientResult.success = true;
          clientResult.message = "";
          readerUser.password = "";
          clientResult.data = readerUser;
        }

        this.sendResponse(clientResult, response);
      },
      error: (err: any) => {
        clientResult.message = readerUser.toString() + " could not be created: " + err;
        this.sendResponse(clientResult, response);
      }
    });
  }

  login(request: Request, response: Response): void {
    const clientResult: ClientResult = new ClientResult();
    const readerUser: ReaderUser = new ReaderUser(0, request.body.name, request.body.email, null, null, this.ecryptPassword(request.body.password));

    this.READER_PROCESS.login(readerUser).subscribe({
      next: (result: ReaderUser) => {
        if (result != null) {
          clientResult.success = true;
          clientResult.message = "";
          clientResult.data = result;
        }

        this.sendResponse(clientResult, response);
      },
      error: (err: any) => {
        clientResult.message = readerUser.toString() + " could not be created: " + err;
        this.sendResponse(clientResult, response);
      }
    });
  }

  loginWithToken(request: Request, response: Response): void {
    const clientResult: ClientResult = new ClientResult();
    const token: string = request.body.token;

    this.READER_PROCESS.loginWithToken(token).subscribe({
      next: (result: ReaderUser) => {
        if (result != null) {
          clientResult.success = true;
          clientResult.message = "";
          clientResult.data = result;
        } else {
          clientResult.message = "Token: " + token + " not found";
          clientResult.revokeToken = true;
        }

        this.sendResponse(clientResult, response);
      },
      error: (err: any) => {
        console.log(err);
      }
    });
  }

  subscribe(request: Request, response: Response): void {
    const clientResult: ClientResult = new ClientResult();
    const feedUrl: string = request.body.feedUrl;
    const token: string = request.body.token;

    this.READER_PROCESS.subscribe(feedUrl, token).subscribe({
      next: (result: Subscription) => {
        if (result != null) {
          clientResult.success = true;
          clientResult.message = "";
          clientResult.data = result;
        }

        this.sendResponse(clientResult, response);
      },
      error: (err: any) => {
        clientResult.message = "Feed URL: " + feedUrl + " not found: " + err;
        this.sendResponse(clientResult, response);
      }
    });
  }

  getEntries(request: Request, response: Response): void {
    const clientResult: ClientResult = new ClientResult();
    const suscriptionId: number = request.body.suscriptionId;
    const includeRead: boolean = request.body.includeRead;
    const newestFirst: boolean = request.body.newestFirst;
    const pageSize: number = request.body.pageSize;
    const page: number = request.body.page;
    const token: string = request.body.token;

    this.READER_PROCESS.getEntries(suscriptionId, includeRead, newestFirst, pageSize, page, token).subscribe({
      next: (result: Array<UserSubscriptionEntryWrapper>) => {
        if (result.length > 0) {
          clientResult.success = true;
          clientResult.message = "";
          clientResult.data = result;
        }

        this.sendResponse(clientResult, response);
      },
      error: (err: any) => {
        clientResult.message = "Feed URL: " + suscriptionId + " not found: " + err;
        this.sendResponse(clientResult, response);
      }
    });
  }

  getSubscriptions(request: Request, response: Response): void {
    const clientResult: ClientResult = new ClientResult();
    const token: string = request.body.token;

    this.READER_PROCESS.getSubscriptions(token).subscribe({
      next: (result: Array<Subscription>) => {
        if (result.length > 0) {
          clientResult.success = true;
          clientResult.message = "";
          clientResult.data = result;
        }

        this.sendResponse(clientResult, response);
      },
      error: (err: any) => {
        clientResult.message = "Could not get subscriptions: " + err;
        this.sendResponse(clientResult, response);
      }
    });
  }

  getCounts(request: Request, response: Response): void {
    const clientResult: ClientResult = new ClientResult();
    const token: string = request.body.token;

    this.READER_PROCESS.getCounts(token).subscribe({
      next: (result: Map<string, number>) => {
        if (result.size > 0) {
          clientResult.success = true;
          clientResult.message = "";
          clientResult.data = result;
        }

        this.sendResponse(clientResult, response);
      },
      error: (err: any) => {
        clientResult.message = "Could not get subscriptions: " + err;
        this.sendResponse(clientResult, response);
      }
    });
  }

  markRead(request: Request, response: Response): void {
    const clientResult: ClientResult = new ClientResult();
    const token: string = request.body.token;
    const read: boolean = request.body.read;
    const subscriptionEntryId: number = parseInt(request.body.subscriptionEntryId);

    this.READER_PROCESS.markRead(token, subscriptionEntryId, read).subscribe({
      next: (result: boolean) => {
        clientResult.success = result;
        clientResult.message = "";
        this.sendResponse(clientResult, response);
      },
      error: (err: any) => {
        clientResult.message = "Could not get subscriptions: " + err;
        this.sendResponse(clientResult, response);
      }
    });
  }

  markAllRead(request: Request, response: Response): void {
    const clientResult: ClientResult = new ClientResult();
    const token: string = request.body.token;
    const subscriptionId: number = parseInt(request.body.subscriptionId);

    this.READER_PROCESS.markAllRead(token, subscriptionId).subscribe({
      next: (result: boolean) => {
        clientResult.success = result;
        clientResult.message = "";
        this.sendResponse(clientResult, response);
      },
      error: (err: any) => {
        clientResult.message = "Could not get subscriptions: " + err;
        this.sendResponse(clientResult, response);
      }
    });
  }

  private ecryptPassword(password: string): string {
    return crypto.createHash("sha256").update(password).digest("hex");
  }

  private sendResponse(object: any, response: Response): void {
    response.appendHeader("Content-Type", "application/json; charset=utf-8");
    response.send(JSON.stringify(object, (key: any, value: any) => {
      if (value instanceof Map) {
        const newValue: any = {};
        
        value.forEach((mapValue, mapKey) => {
            newValue[mapKey] = mapValue;
        });
        
        return newValue;
      } else {
        return value;
      }
    }));
  }
}
