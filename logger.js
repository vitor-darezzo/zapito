// config/logger.js

import { createLogger, transports, format } from "winston";

function safeStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return "[Unstringifiable object]";
  }
}

const logger = createLogger({
  level: "debug",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? safeStringify(meta) : ""}`;
    })
  ),
  transports: [
    new transports.Console()
  ],
});

export default logger;
