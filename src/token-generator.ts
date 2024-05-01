const { v4: uuid4 } = require("uuid");

export class TokenGenerator  {
  static readonly characters: string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
  static generateToken(): string {
    let uuid: string = uuid4();
    uuid = uuid.replaceAll("-", "");
    uuid = ("0000000000000000" + (parseInt(uuid.substring(0, 8), 16).toString(2)) + (parseInt(uuid.substring(8, 16), 16).toString(2))
      + (parseInt(uuid.substring(16, 24), 16).toString(2)) + (parseInt(uuid.substring(24), 16).toString(2)));
    uuid = uuid.substring(uuid.length - 128, uuid.length);
    let token: string = "";
    while (uuid.length > 0) {
      let index: number = uuid.length - 6;
      if (index < 0) {
        index = 0;
      }
      const number: number = parseInt(uuid.substring(index, uuid.length), 2);
      const digit: string = this.characters.substring(number, number + 1);
      token = digit + token;
      uuid = uuid.substring(0, index);
    }

    return token;
  }
}
