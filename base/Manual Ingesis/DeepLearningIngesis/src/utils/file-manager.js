/**
 * File Manager Utility
 * Gestión de operaciones de archivos y directorios
 */

import fs from 'fs-extra';
import path from 'path';

class FileManager {
  /**
   * Asegura que un directorio existe
   */
  static async ensureDir(dirPath) {
    await fs.ensureDir(dirPath);
  }

  /**
   * Guarda datos en formato JSON
   */
  static async saveJSON(filePath, data) {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeJSON(filePath, data, { spaces: 2 });
  }

  /**
   * Lee datos desde un archivo JSON
   */
  static async readJSON(filePath) {
    return await fs.readJSON(filePath);
  }

  /**
   * Guarda texto en un archivo
   */
  static async saveText(filePath, content) {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Lee texto desde un archivo
   */
  static async readText(filePath) {
    return await fs.readFile(filePath, 'utf-8');
  }

  /**
   * Lista archivos en un directorio
   */
  static async listFiles(dirPath, extension = null) {
    const files = await fs.readdir(dirPath);
    if (extension) {
      return files.filter(file => file.endsWith(extension));
    }
    return files;
  }

  /**
   * Verifica si un archivo existe
   */
  static async exists(filePath) {
    return await fs.pathExists(filePath);
  }

  /**
   * Elimina un archivo o directorio
   */
  static async remove(path) {
    await fs.remove(path);
  }

  /**
   * Obtiene el tamaño de un archivo en bytes
   */
  static async getFileSize(filePath) {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  /**
   * Copia un archivo
   */
  static async copy(src, dest) {
    await fs.copy(src, dest);
  }
}

export default FileManager;
