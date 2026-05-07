import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

export const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.Console(),
    new DailyRotateFile({
      filename: "logs/admin-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d",
    }),
  ],
});
