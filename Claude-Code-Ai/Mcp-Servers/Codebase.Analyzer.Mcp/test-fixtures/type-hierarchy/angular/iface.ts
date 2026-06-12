export interface Speakable {
  speak(): void;
}

export interface Named extends Speakable {
  name: string;
}
