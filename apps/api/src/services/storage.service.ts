import { storage } from "../lib/index.js";

export class StorageService {
  private bucket = storage.bucket();

  async uploadFile(
    path: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    const file = this.bucket.file(path);

    await file.save(buffer, {
      metadata: { contentType },
    });

    await file.makePublic();

    return file.publicUrl();
  }

  async deleteFile(path: string): Promise<boolean> {
    try {
      await this.bucket.file(path).delete();
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(
    path: string,
    expiresInMinutes: number = 60
  ): Promise<string> {
    const [url] = await this.bucket.file(path).getSignedUrl({
      action: "read",
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return url;
  }

  async fileExists(path: string): Promise<boolean> {
    const [exists] = await this.bucket.file(path).exists();
    return exists;
  }
}

export const storageService = new StorageService();
