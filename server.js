const express = require("express");
const app = express();
const { host, port, BASE_URI } = require("./src/config/serverConfig");

const TelegramBot = require("node-telegram-bot-api");
const puppeteer = require("puppeteer");
const { logger } = require("./logger");
const { splitLongRead } = require("./src/utils/utils");
const dotenv = require("dotenv").config();
// const context = require("request-context");
// const { v4: generateUUID } = require("uuid");

app.use(express.json());

app.use((req, res, next) => {
	res
		.type("text/plain")
		.set("Access-Control-Allow-Origin", "*")
		.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		.set(
			"Access-Control-Allow-Headers",
			"Origin, X-Requested-With, Content-Type, Accept"
		);
	next();
});

// Create BOT
try {
	const bot = new TelegramBot("6410482082:AAEjq3L2oHE68n_p_tq045B2GY_MkyapsRw", {
		polling: {
			autoStart: true,
			interval: 1000,
		},
	});

	logger.info("Start bot", bot);

	bot.on("message", async (msg) => {
		await bot.sendMessage(msg.chat.id, "coming soon", {});

		logger.info(`Bot get message = ${msg.text} `); // log info bot messsage

		// Start Puppeteer
		const browser = await puppeteer.launch({
			headless: false,
			defaultViewport: { width: 1200, height: 1024 },
		});

		const page = await browser.newPage();
		logger.info(`create a page = ${page.url()}`);
		await page.goto(BASE_URI, {
			waitUntil: "domcontentloaded",
		});

		await page.focus("#query");
		await page.keyboard.type(msg.text);
		await page.keyboard.press("Enter");

		const element = await page.waitForSelector("table.noBorderTbl").then((el) =>
			el.$$("tr >>> a").then((result2) =>
				Promise.all(
					result2.map(async (t) => {
						return await t.evaluate((x) => x.getAttribute("href"));
					})
				)
			)
		);

		const page2 = await browser.newPage();

		await page2.goto(`${BASE_URI}${element[0]}`);

		await page2.waitForSelector(".zebra.noBorderTbl");

		const news = await page2.$$eval(".zebra.noBorderTbl >>> tr", (options) => {
			return options.map((option) => option.textContent);
		});

		const refs = await page2.$$eval(".zebra.noBorderTbl >>> a", (options) => {
			return options.map((option) => option.getAttribute("href"));
		});
		logger.info(`get news ${news.slice(-1)}`);

		const objPages = Object.create(null); // obj with arr

		for (let i = 0; i < 2; i++) {
			const newPage = await browser.newPage();
			await newPage.goto(BASE_URI + refs[i]);

			objPages[`newPageMainText${i}`] = await newPage.$$eval("#cont_wrap", (options) => {
				return options.map((option) => option.textContent);
			});
		}

		for (let pageMainText in objPages) {
			const pageArr = objPages[pageMainText];
			pageArr.forEach(async (el) => {
				if (el.length > 4096) {
					await bot.sendMessage(msg.chat.id, el.slice(0, 4095));
				} else {
					await bot.sendMessage(msg.chat.id, el);
				}
			});
		}

		browser.close();
	});
} catch (e) {
	console.log(e);
	logger.error(e);
}

app.use((err, req, res, next) => {
	console.log(err);
	logger.fatal(err);
	res.status(500).send(err.toString());
	next();
});

app.listen(port, host, () => {
	console.log(`server start on http//:${host}:${port} `);
});
