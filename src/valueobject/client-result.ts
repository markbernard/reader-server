export class ClientResult {
  constructor(public success: boolean = false, public message: string = "An unknown error occurred.", public revokeToken: boolean = false, public data: any = null) {}
}