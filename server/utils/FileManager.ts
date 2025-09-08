import { promises as fs } from 'fs';
import path from 'path';
import multer from 'multer';

export class FileManager {
  private static readonly UPLOADS_DIR = path.join(process.cwd(), 'uploads');

  constructor(private rootDir: string) {
    this.rootDir = path.resolve(rootDir);
    this.init();
  }

  private async init() {
    await fs.mkdir(this.rootDir, { recursive: true });
    await fs.mkdir(FileManager.UPLOADS_DIR, { recursive: true });
  }

  private validatePath(itemPath: string): string {
    // Strip leading slash to treat it as relative to the rootDir
    const relativePath = itemPath.startsWith('/') ? itemPath.substring(1) : itemPath;
    const absolutePath = path.join(this.rootDir, relativePath);

    // Security check to prevent path traversal
    if (!absolutePath.startsWith(this.rootDir)) {
      throw new Error(`Access denied: Path '${itemPath}' is outside the allowed directory.`);
    }
    return absolutePath;
  }

  async listDirectory(dirPath: string = '/') {
    const safePath = this.validatePath(dirPath);
    const entries = await fs.readdir(safePath, { withFileTypes: true });

    const fileList = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(safePath, entry.name);
        let size, lastModified;
        if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          size = stats.size;
          lastModified = stats.mtime.toISOString();
        }
        return {
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          size,
          lastModified,
        };
      })
    );

    return fileList;
  }

  async createFolder(folderName: string, basePath: string = '/') {
    const safePath = this.validatePath(path.join(basePath, folderName));
    await fs.mkdir(safePath, { recursive: true });
    return { success: true, message: 'Folder created successfully.' };
  }

  async deleteItem(itemName: string, basePath: string = '/') {
    const safePath = this.validatePath(path.join(basePath, itemName));
    const stats = await fs.stat(safePath);
    if (stats.isDirectory()) {
      await fs.rm(safePath, { recursive: true, force: true });
    } else {
      await fs.unlink(safePath);
    }
    return { success: true, message: 'Item deleted successfully.' };
  }

  async renameItem(oldName: string, newName: string, basePath: string = '/') {
    const oldPath = this.validatePath(path.join(basePath, oldName));
    const newPath = this.validatePath(path.join(basePath, newName));
    await fs.rename(oldPath, newPath);
    return { success: true, message: 'Item renamed successfully.' };
  }

  getDownloadPath(fileName: string, basePath: string = '/') {
    return this.validatePath(path.join(basePath, fileName));
  }

  getMulterUpload() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, FileManager.UPLOADS_DIR);
      },
      filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
      },
    });
    return multer({ storage });
  }

  async handleUpload(file: Express.Multer.File, destination: string = '/') {
    if (!file) {
      throw new Error('No file provided for upload.');
    }
    const finalPath = this.validatePath(path.join(destination, file.originalname));
    await fs.rename(file.path, finalPath);
    return { success: true, message: 'File uploaded successfully.' };
  }
}
