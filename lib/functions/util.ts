import fetch, { RequestInit } from "node-fetch";
import { htmlToText } from "html-to-text";

import logs from "../events";
import { EcoleDirecteAPIError } from "../errors";
import { expandedBase64, isFailure } from "../types/";

export function toISODate(date: Date | string | number): string {
	const d = new Date(date);
	if (isNaN(d.getTime())) throw new Error("Invalid date");

	return [
		d.getFullYear(),
		(d.getMonth() + 1).toString().padStart(2, "0"),
		d.getDate().toString().padStart(2, "0"),
	].join("-");
}

export function expandBase64(htmlBase64: string): expandedBase64 {
	return {
		original: htmlBase64,
		html: Buffer.from(htmlBase64, "base64").toString(),
		text: htmlToText(Buffer.from(htmlBase64, "base64").toString(), {
			wordwrap: false,
		}),
	};
}

export async function makeRequest(
	options: {
		method: "GET" | "POST";
		url: string;
		body?: Record<string, unknown>;
		guard?: boolean;
	} = { method: "GET", url: "", guard: false }
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	const { method, url, body, guard } = options;
	logs.emit("request", { method, url, body });
	const params: RequestInit = {
		method: method,
		headers: EdHeaders,
	};

	if (method === "POST") {
		const urlencoded = new URLSearchParams();
		urlencoded.append("data", JSON.stringify(body));
		params.body = urlencoded;
	}

	const response = await fetch(url, params);
	const resBody = await response.json();

	if (guard && isFailure(resBody)) throw new EcoleDirecteAPIError(resBody);

	return resBody;
}

export const EdHeaders = {
	authority: "api.ecoledirecte.com",
	accept: "application/json, text/plain, */*",
	"user-agent":
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
	"content-type": "application/x-www-form-urlencoded",
	origin: "https://www.ecoledirecte.com",
	"sec-fetch-site": "same-site",
	"sec-fetch-mode": "cors",
	"sec-fetch-dest": "empty",
	referer: "https://www.ecoledirecte.com/",
	"accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
};
