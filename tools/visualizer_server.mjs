#!/usr/bin/env node

import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MIME_TYPES = {
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".js": "application/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".png": "image/png",
	".svg": "image/svg+xml",
};

function parseArgs(argv)
{
	const options = {
		pushSwap: "./push_swap",
		checker: "./checker",
		port: 3000,
		host: "127.0.0.1",
	};
	let index;

	index = 0;
	while (index < argv.length)
	{
		if (argv[index] === "--push-swap")
			options.pushSwap = argv[++index];
		else if (argv[index] === "--checker")
			options.checker = argv[++index];
		else if (argv[index] === "--port")
			options.port = Number(argv[++index]);
		else if (argv[index] === "--host")
			options.host = argv[++index];
		else
			throw new Error(`Unknown argument: ${argv[index]}`);
		index++;
	}
	if (!Number.isInteger(options.port) || options.port <= 0)
		throw new Error("--port must be a positive integer");
	return (options);
}

function resolveBinaryPath(binaryPath)
{
	let resolved;

	if (!binaryPath)
		return ("");
	if (binaryPath.includes("/") || binaryPath.includes("\\") || binaryPath.startsWith("."))
	{
		resolved = resolve(binaryPath);
		if (existsSync(resolved))
			return (resolved);
		if (process.platform === "win32" && !resolved.endsWith(".exe") && existsSync(`${resolved}.exe`))
			return (`${resolved}.exe`);
		return (resolved);
	}
	return (binaryPath);
}

function runBinary(binaryPath, args, stdin)
{
	let result;

	if (process.platform === "win32" && /\.(cmd|bat)$/i.test(binaryPath))
	{
		const command = `""${binaryPath}" ${args.map((arg) => `"${String(arg).replace(/"/g, "\"\"")}"`).join(" ")}"`;

		result = spawnSync("cmd.exe", ["/d", "/s", "/c", command], {
			encoding: "utf8",
			input: stdin,
			maxBuffer: 1024 * 1024 * 32,
			windowsVerbatimArguments: true,
		});
	}
	else
	{
		result = spawnSync(binaryPath, args, {
			encoding: "utf8",
			input: stdin,
			maxBuffer: 1024 * 1024 * 32,
		});
	}
	if (result.error)
		throw result.error;
	return ({
		status: result.status ?? 0,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
	});
}

function parseOperations(stdout)
{
	const trimmed = stdout.trim();

	if (!trimmed)
		return ([]);
	return (trimmed.split(/\r?\n/).filter(Boolean));
}

function validateOperations(operations)
{
	const allowedOps = new Set([
		"sa",
		"sb",
		"ss",
		"pa",
		"pb",
		"ra",
		"rb",
		"rr",
		"rra",
		"rrb",
		"rrr",
	]);
	let index;

	index = 0;
	while (index < operations.length)
	{
		if (!allowedOps.has(operations[index]))
			throw new Error(`Unknown operation emitted by push_swap: ${operations[index]}`);
		index++;
	}
}

function checkerVerdict(checkerPath, input, operations)
{
	let result;

	if (!checkerPath || !existsSync(checkerPath))
		return ("SKIPPED");
	result = runBinary(checkerPath, input.map(String), `${operations.join("\n")}\n`);
	if (result.status !== 0 && result.stdout.trim() !== "Error")
		throw new Error(`checker exited with status ${result.status}`);
	return (result.stdout.trim() || "(no output)");
}

function generateInput(size, preset)
{
	const values = Array.from({ length: size }, (_, index) => index + 1);
	let index;
	let left;
	let right;
	let temp;
	let swaps;

	if (preset === "sorted")
		return (values);
	if (preset === "reverse")
		return (values.reverse());
	if (preset === "almost-sorted")
	{
		swaps = Math.max(1, Math.floor(size * 0.08));
		index = 0;
		while (index < swaps)
		{
			left = Math.floor(Math.random() * Math.max(size - 1, 1));
			right = Math.min(left + 1 + Math.floor(Math.random() * 2), size - 1);
			temp = values[left];
			values[left] = values[right];
			values[right] = temp;
			index++;
		}
		return (values);
	}
	index = values.length - 1;
	while (index > 0)
	{
		left = Math.floor(Math.random() * (index + 1));
		temp = values[index];
		values[index] = values[left];
		values[left] = temp;
		index--;
	}
	return (values);
}

function isSorted(values)
{
	let index;

	index = 1;
	while (index < values.length)
	{
		if (values[index - 1] > values[index])
			return (false);
		index++;
	}
	return (true);
}

function buildTracePayload(input, operations, checker, preset, pushSwapPath)
{
	return ({
		title: `Live push_swap run (${input.length} values)`,
		input,
		operations,
		totalOps: operations.length,
		checker,
		alreadySorted: operations.length === 0 && isSorted(input),
		meta: {
			source: "live server",
			checker,
			preset,
			opCount: operations.length,
			size: input.length,
			pushSwap: pushSwapPath,
			createdAt: new Date().toISOString(),
		},
	});
}

function setCors(res)
{
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, status, payload)
{
	setCors(res);
	res.writeHead(status, {
		"Content-Type": "application/json; charset=utf-8",
	});
	res.end(JSON.stringify(payload));
}

function sendText(res, status, message)
{
	setCors(res);
	res.writeHead(status, {
		"Content-Type": "text/plain; charset=utf-8",
	});
	res.end(message);
}

async function readBody(req)
{
	return (await new Promise((resolvePromise, rejectPromise) =>
	{
		let body;

		body = "";
		req.on("data", (chunk) =>
		{
			body += chunk;
			if (body.length > 1_000_000)
				rejectPromise(new Error("Request body too large"));
		});
		req.on("end", () => resolvePromise(body));
		req.on("error", rejectPromise);
	}));
}

function serveStatic(res, visualizerDir, pathname)
{
	const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
	const filePath = resolve(visualizerDir, relativePath);

	if (!filePath.startsWith(visualizerDir))
	{
		sendText(res, 403, "Forbidden");
		return ;
	}
	try
	{
		const contents = readFileSync(filePath);
		const mimeType = MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";

		setCors(res);
		res.writeHead(200, {
			"Content-Type": mimeType,
		});
		res.end(contents);
	}
	catch
	{
		sendText(res, 404, `Not found: ${pathname}`);
	}
}

async function main()
{
	const options = parseArgs(process.argv.slice(2));
	const pushSwapPath = resolveBinaryPath(options.pushSwap);
	const checkerPath = resolveBinaryPath(options.checker);
	const scriptPath = fileURLToPath(import.meta.url);
	const toolsDir = dirname(scriptPath);
	const repoRoot = resolve(toolsDir, "..");
	const visualizerDir = resolve(repoRoot, "visualizer");
	const server = createServer(async (req, res) =>
	{
		const requestUrl = new URL(req.url, `http://${req.headers.host}`);

		if (req.method === "OPTIONS")
		{
			setCors(res);
			res.writeHead(204);
			res.end();
			return ;
		}
		if (req.method === "GET" && requestUrl.pathname === "/status")
		{
			sendJson(res, 200, {
				pushSwap: {
					path: pushSwapPath,
					exists: existsSync(pushSwapPath),
				},
				checker: {
					path: checkerPath,
					exists: existsSync(checkerPath),
				},
				visualizerDir,
				serverOrigin: `http://${options.host}:${options.port}`,
			});
			return ;
		}
		if (req.method === "GET" && requestUrl.pathname === "/generate")
		{
			const size = Math.max(1, Math.min(1000, Number(requestUrl.searchParams.get("size") || "20")));
			const preset = requestUrl.searchParams.get("preset") || "random";

			if (!["random", "sorted", "reverse", "almost-sorted"].includes(preset))
			{
				sendJson(res, 400, {
					error: "preset must be random, sorted, reverse, or almost-sorted",
				});
				return ;
			}
			sendJson(res, 200, {
				input: generateInput(size, preset),
				preset,
				size,
			});
			return ;
		}
		if (req.method === "POST" && requestUrl.pathname === "/run")
		{
			let payload;
			let input;
			let result;
			let operations;
			let checker;

			try
			{
				payload = JSON.parse(await readBody(req));
			}
			catch (error)
			{
				sendJson(res, 400, {
					error: error.message === "Request body too large" ? error.message : "Invalid JSON body",
				});
				return ;
			}
			if (!Array.isArray(payload.input) || payload.input.length === 0)
			{
				sendJson(res, 400, {
					error: "input must be a non-empty array of integers",
				});
				return ;
			}
			input = payload.input.map((value) => Number(value));
			if (input.some((value) => !Number.isInteger(value) || value < -2147483648 || value > 2147483647))
			{
				sendJson(res, 400, {
					error: "all values must be 32-bit signed integers",
				});
				return ;
			}
			if (new Set(input).size !== input.length)
			{
				sendJson(res, 400, {
					error: "duplicate values are not allowed",
				});
				return ;
			}
			if (!existsSync(pushSwapPath))
			{
				sendJson(res, 503, {
					error: `push_swap was not found at ${pushSwapPath}`,
				});
				return ;
			}
			try
			{
				result = runBinary(pushSwapPath, input.map(String), "");
			}
			catch (error)
			{
				sendJson(res, 500, {
					error: error.message,
				});
				return ;
			}
			if (result.stderr.includes("Error"))
			{
				sendJson(res, 422, {
					error: "push_swap rejected the provided input",
				});
				return ;
			}
			if (result.status !== 0)
			{
				sendJson(res, 500, {
					error: `push_swap exited with status ${result.status}`,
				});
				return ;
			}
			operations = parseOperations(result.stdout);
			try
			{
				validateOperations(operations);
				checker = checkerVerdict(checkerPath, input, operations);
			}
			catch (error)
			{
				sendJson(res, 500, {
					error: error.message,
				});
				return ;
			}
			sendJson(res, 200, buildTracePayload(
				input,
				operations,
				checker,
				String(payload.preset || "custom"),
				pushSwapPath
			));
			return ;
		}
		if (req.method === "GET")
		{
			serveStatic(res, visualizerDir, requestUrl.pathname);
			return ;
		}
		sendJson(res, 405, {
			error: "Method not allowed",
		});
	});

	server.listen(options.port, options.host, () =>
	{
		console.log("push_swap visualizer server");
		console.log(`  URL:       http://${options.host}:${options.port}`);
		console.log(`  push_swap: ${pushSwapPath}`);
		console.log(`  checker:   ${checkerPath}`);
		console.log(`  visualizer:${visualizerDir}`);
		if (!existsSync(pushSwapPath))
			console.log("  Build push_swap first or pass --push-swap with an explicit path.");
	});
	server.on("error", (error) =>
	{
		console.error(`Server error: ${error.message}`);
		process.exit(1);
	});
}

main().catch((error) =>
{
	console.error(`Error: ${error.message}`);
	process.exit(1);
});
