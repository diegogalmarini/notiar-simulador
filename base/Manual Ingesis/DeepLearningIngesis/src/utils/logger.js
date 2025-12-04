/**
 * Logger Utility
 * Proporciona funciones de logging con timestamps
 */

class Logger {
  constructor(prefix = 'APP') {
    this.prefix = prefix;
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  info(message, data = null) {
    console.log(`[${this.getTimestamp()}] [${this.prefix}] ℹ️  ${message}`);
    if (data) console.log(data);
  }

  success(message, data = null) {
    console.log(`[${this.getTimestamp()}] [${this.prefix}] ✅ ${message}`);
    if (data) console.log(data);
  }

  warn(message, data = null) {
    console.warn(`[${this.getTimestamp()}] [${this.prefix}] ⚠️  ${message}`);
    if (data) console.warn(data);
  }

  error(message, error = null) {
    console.error(`[${this.getTimestamp()}] [${this.prefix}] ❌ ${message}`);
    if (error) console.error(error);
  }

  progress(current, total, item = '') {
    const percentage = ((current / total) * 100).toFixed(1);
    console.log(`[${this.getTimestamp()}] [${this.prefix}] 📊 Progreso: ${current}/${total} (${percentage}%) ${item}`);
  }
}

export default Logger;
