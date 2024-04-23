const options = {
	logDirectory: "./logs", // Директория для хранения логгов (должна существовать)
	fileNamePattern: "<DATE>.log", // Паттерн файла логов
	dateFormat: "DD.MM.YYYY", // Формат даты
};

const logger = require("simple-node-logger").createRollingFileLogger(options);
module.exports = { logger };
