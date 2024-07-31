const { format, createLogger, transports } = require("winston");
const { combine, label, json, prettyPrint, timestamp } = format;
require("winston-daily-rotate-file");

//DailyRotateFile func()
const fileRotateTransport = new transports.DailyRotateFile({
    filename: "logs/log-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    maxFiles: "7d",
});

const logger = createLogger({
    level: "debug",
    format: combine(
        //label({ label: CATEGORY }),
        timestamp({
            format: "MMM-DD-YYYY HH:mm:ss",
        }),
        //json(),
        prettyPrint()
    ),
    transports: [fileRotateTransport, new transports.Console()],
});

module.exports = logger;