import { FileManager } from "./utils/FileManager";
import { User, Workspace } from "../shared/schema";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      fileManager: FileManager;
      workspace?: Workspace;
    }
  }
}
