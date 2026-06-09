export class BoyscoutSample {
  private unusedHelper(): void {
    console.log("never called");
  }

  readDom(): string {
    const el = document.getElementById("panel");
    return el!.innerText;
  }

  public publishOrder(order: { id: string }, items: { qty: number; price: number }[]): number {
    let total = 0;
    let valid = true;

    for (const item of items) {
      if (item.qty <= 0) {
        valid = false;
        break;
      }
      if (item.price < 0) {
        valid = false;
      }
    }
    if (!valid) {
      throw new Error("invalid");
    }

    for (const item of items) {
      let line = item.qty * item.price;
      if (order.id.startsWith("VIP")) {
        line = line * 0.9;
      } else if (order.id.startsWith("BULK")) {
        line = line * 0.85;
      }
      if (line > 500) {
        line = line * 0.95;
      } else if (line > 100) {
        line = line * 0.98;
      }
      total += line;
    }

    return total;
  }
}
