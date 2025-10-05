import { v4 as uuidv4 } from "uuid";

export type EmbeddedChunk = {
  id: string;
  text: string;
  embedding: number[];
};

export type Collection = {
  id: string;
  createdAt: number;
  chunks: EmbeddedChunk[];
};

const collections = new Map<string, Collection>();

export function createCollection(chunks: EmbeddedChunk[]): string {
  const id = uuidv4();
  const collection: Collection = {
    id,
    createdAt: Date.now(),
    chunks,
  };
  collections.set(id, collection);
  return id;
}

export function getCollection(id: string): Collection | undefined {
  return collections.get(id);
}

export function clearCollection(id: string): boolean {
  return collections.delete(id);
}
