// SPDX-License-Identifier: MIT
import { resolveFilelist, type ResolvedFilelist } from '../../filelist/FilelistResolver';

export class FilelistProjectSourceProvider {
  load(filelistPath: string): ResolvedFilelist {
    return resolveFilelist(filelistPath);
  }
}
