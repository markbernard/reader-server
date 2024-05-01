export class ReaderUser {
  constructor(public id: number = 0, public name: string = "", public email: string = "", public token: string | null = null,
    public tokenExpiry: Date | null = null, public password: string = "") {}

  copy(readerUser: ReaderUser): void {
    this.id = readerUser.id;
    this.name = readerUser.name;
    this.email = readerUser.email;
    this.token = readerUser.token;
    this.tokenExpiry = readerUser.tokenExpiry;
    this.password = readerUser.password;
  }

  toString(): string {
    return "ReaderUser ["
      + "id: " + this.id
      + ", name: " + this.name
      + ", email: " + this.email
      + ", token: " + this.token
      + ", tokenExpirey: " + this.tokenExpiry + "]";
  }
}