import fetch, { RequestInit } from "node-fetch";
import { failureRes, isFailure, root } from "ecoledirecte-api-types/v3";

import logs from "../events";
import { EcoleDirecteAPIError } from "../errors";
import EventEmitter from "events";
import { Account } from "../accounts";

export function toISODate(date: Date | string | number): string {
	const d = new Date(date);
	if (isNaN(d.getTime())) throw new Error("Invalid date");

	return [
		d.getFullYear(),
		(d.getMonth() + 1).toString().padStart(2, "0"),
		d.getDate().toString().padStart(2, "0"),
	].join("-");
}

/**
 *
 * @description Makes bytes human-readable
 */
export function formatBytes(bytes: number): string {
	let formatted: string;
	if (bytes >= 1073741824) {
		formatted = (bytes / 1073741824).toFixed(2) + " GB";
	} else if (bytes >= 1048576) {
		formatted = (bytes / 1048576).toFixed(2) + " MB";
	} else if (bytes >= 1024) {
		formatted = (bytes / 1024).toFixed(2) + " KB";
	} else if (bytes > 1) {
		formatted = bytes + " bytes";
	} else if (bytes === 1) {
		formatted = bytes + " byte";
	} else {
		formatted = "0 bytes";
	}
	return formatted;
}

export async function makeRequest(
	options: {
		method: "GET" | "POST";
		path: string;
		body?: Record<string, unknown>;
		guard?: boolean;
	},
	context: Record<string, unknown> = {},
	account?: Account
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	const { method, path, body, guard } = options;
	const url = Config.get("root") + path;
	const resListener = new EventEmitter();
	function onRes(callback: (res: Response) => void) {
		resListener.on("response", callback);
	}
	function offRes(callback: (res: Response) => void) {
		resListener.off("response", callback);
	}
	logs.emit("request", { method, url, body, context, onRes, offRes });
	const params: RequestInit = {
		method: method,
		headers: { ...EdHeaders, ...Config.get("addedHeaders") },
	};

	if (method === "POST") {
		const urlencoded = new URLSearchParams();
		urlencoded.append("data", JSON.stringify(body));
		params.body = urlencoded;
	}

	const response = await fetch(url, params);

	const resBody = (await response.json()) as Record<string, unknown>;

	resListener.emit("response", { response, body: resBody });

	const failure = isFailure(resBody);
	if (guard && failure) throw new EcoleDirecteAPIError(resBody as failureRes);

	const someToken =
		(resBody.token as string | undefined) || response.headers.get("x-token");
	if (!failure && account && someToken) account.token = someToken;

	return resBody;
}

export const USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36";

export const EdHeaders = {
	authority: "api.ecoledirecte.com",
	accept: "application/json, text/plain, */*",
	"user-agent": USER_AGENT,
	"content-type": "application/x-www-form-urlencoded",
	origin: "https://www.ecoledirecte.com",
	"sec-fetch-site": "same-site",
	"sec-fetch-mode": "cors",
	"sec-fetch-dest": "empty",
	referer: "https://www.ecoledirecte.com/",
	"accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
};

export type FullConfig = {
	root: string;
	addedHeaders: Record<string, string>;
};

export type PartialConfig = Partial<FullConfig>;

export const DefaultConfig: FullConfig = {
	root: root,
	addedHeaders: {},
};

export class ConfigConstructor {
	static instance = new ConfigConstructor();

	constructor(public source: PartialConfig = {}) {}
	get<K extends keyof FullConfig>(key: K): FullConfig[K] {
		const fromSource = this.source[key] as FullConfig[K] | undefined;
		const fromDefault = DefaultConfig[key];
		return fromSource ?? fromDefault;
	}
}

export const Config = ConfigConstructor.instance;
