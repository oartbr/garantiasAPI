const { randomInt } = require('node:crypto');
class CodeGenerator {
  code = "";
  chars = "";

  constructor(length = 7, type = "string", prefix = "") {
    this.length = length;
    this.type = type;
    this.prefix = prefix;
    this.chars =
      this.type === "string"
        ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        : "0123456789";
    
    this.collection = [];
    this.new();
    return this;
  }

  new() {
    this.code = "";

    for (let i = 0; i < this.length; i++) {
      const randomIndex = randomInt(this.chars.length);
      this.code += this.chars.charAt(randomIndex);
    }

    return this.code = this.prefix + this.code;
  }

  create(quantity){
    if (!Number.isInteger(quantity) || quantity < 0 || this.collection.length + quantity > this.chars.length ** this.length) {
      throw new RangeError('Invalid code quantity');
    }
    for (let i = 0; i < quantity; i++) {
      this.new();
      if (this.collection.includes(this.code)) {
        i--;
      } else {
        this.addToCollection();
      }
    }
    return this.collection;
  }

  addToCollection(){
    this.collection.push(this.code);
  }
}

module.exports = CodeGenerator;
