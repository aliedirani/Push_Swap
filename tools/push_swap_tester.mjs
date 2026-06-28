#!/usr/bin/env node

import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ALLOWED_OPS = new Set([
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

const GRADE_LIMITS = {
	100: [700, 900, 1100, 1300, 1500],
	500: [5500, 7000, 8500, 10000, 11500],
};

function parseArgs(argv)
{
	const options = {
		pushSwap: "./push_swap",
		checker: "./checker",
		size: 100,
		runs: 25,
		min: null,
		max: null,
		quiet: false,
		exportTrace: "",
		help: false,
	};
	let i;

	i = 0;
	while (i < argv.length)
	{
		if (argv[i] === "--push-swap")
			options.pushSwap = argv[++i];
		else if (argv[i] === "--checker")
			options.checker = argv[++i];
		else if (argv[i] === "--size")
			options.size = Number(argv[++i]);
		else if (argv[i] === "--runs")
			options.runs = Number(argv[++i]);
		else if (argv[i] === "--min")
			options.min = Number(argv[++i]);
		else if (argv[i] === "--max")
			options.max = Number(argv[++i]);
		else if (argv[i] === "--export-trace")
			options.exportTrace = argv[++i];
		else if (argv[i] === "--quiet")
			options.quiet = true;
		else if (argv[i] === "--help" || argv[i] === "-h")
			options.help = true;
		else
			throw new Error(`Unknown argument: ${argv[i]}`);
		i++;
	}
	if (!Number.isInteger(options.size) || options.size <= 0)
		throw new Error("--size must be a positive integer");
	if (!Number.isInteger(options.runs) || options.runs <= 0)
		throw new Error("--runs must be a positive integer");
	if (options.min === null)
		options.min = -options.size * 20;
	if (options.max === null)
		options.max = options.size * 20;
	if (options.max - options.min + 1 < options.size)
		throw new Error("Range is too small to generate unique numbers");
	return (options);
}

function printHelp()
{
	console.log(`push_swap tester

Usage:
  node tools/push_swap_tester.mjs [options]

Options:
  --push-swap <path>    Path to push_swap binary (default: ./push_swap)
  --checker <path>      Path to checker binary   (default: ./checker)
  --size <n>            Number count per run     (default: 100)
  --runs <n>            Number of random runs    (default: 25)
  --min <n>             Minimum random value
  --max <n>             Maximum random value
  --export-trace <file> Export the best successful run as JSON
  --quiet               Hide per-run output
  --help, -h            Show this help

Examples:
  node tools/push_swap_tester.mjs --size 100 --runs 50
  node tools/push_swap_tester.mjs --push-swap ./push_swap --checker ./checker --size 500 --runs 20
  node tools/push_swap_tester.mjs --size 20 --runs 1 --export-trace visualizer/sample_trace.json
`);
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

function makeUniqueSample(size, min, max)
{
	const pool = [];
	let current;
	let i;
	let j;
	let temp;

	current = min;
	while (current <= max)
	{
		pool.push(current);
		current++;
	}
	for (i = pool.length - 1; i > 0; i--)
	{
		j = Math.floor(Math.random() * (i + 1));
		temp = pool[i];
		pool[i] = pool[j];
		pool[j] = temp;
	}
	return (pool.slice(0, size));
}

function runBinary(binaryPath, args, stdin)
{
	const result = spawnSync(binaryPath, args, {
		encoding: "utf8",
		input: stdin,
		maxBuffer: 1024 * 1024 * 32,
	});

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
	let i;

	i = 0;
	while (i < operations.length)
	{
		if (!ALLOWED_OPS.has(operations[i]))
			throw new Error(`Unknown operation emitted by push_swap: ${operations[i]}`);
		i++;
	}
}

function checkerVerdict(checkerPath, sample, operations)
{
	if (!checkerPath)
		return ("SKIPPED");
	const result = runBinary(checkerPath, sample.map(String), `${operations.join("\n")}\n`);
	const verdict = result.stdout.trim();

	if (result.status !== 0 && verdict !== "Error")
		throw new Error(`checker exited with status ${result.status}\n${result.stderr}`);
	return (verdict || "(no output)");
}

function scoreBand(size, maxOperations)
{
	const limits = GRADE_LIMITS[size];
	let i;

	if (!limits)
		return ("n/a");
	i = 0;
	while (i < limits.length)
	{
		if (maxOperations < limits[i])
			return (`${5 - i}/5`);
		i++;
	}
	return ("0/5");
}

function average(values)
{
	return (values.reduce((sum, value) => sum + value, 0) / values.length);
}

function exportTrace(filePath, sample, operations, options, summary)
{
	const payload = {
		title: `push_swap trace (${sample.length} values)`,
		input: sample,
		operations,
		meta: {
			pushSwap: options.pushSwap,
			checker: options.checker,
			opCount: operations.length,
			runs: options.runs,
			size: options.size,
			min: options.min,
			max: options.max,
			averageOps: summary.averageOps,
			maxOps: summary.maxOps,
			minOps: summary.minOps,
			scoreBand: summary.scoreBand,
			createdAt: new Date().toISOString(),
		},
	};
	const resolved = resolve(filePath);

	mkdirSync(dirname(resolved), { recursive: true });
	writeFileSync(resolved, JSON.stringify(payload, null, 2));
}

function formatSample(sample)
{
	return (sample.join(" "));
}

function main()
{
	const options = parseArgs(process.argv.slice(2));
	const pushSwapPath = resolveBinaryPath(options.pushSwap);
	const checkerPath = resolveBinaryPath(options.checker);
	const opCounts = [];
	let bestTrace = null;
	let runIndex;

	if (options.help)
	{
		printHelp();
		return ;
	}
	console.log("push_swap tester");
	console.log(`  push_swap: ${pushSwapPath}`);
	console.log(`  checker:   ${checkerPath}`);
	console.log(`  runs:      ${options.runs}`);
	console.log(`  size:      ${options.size}`);
	console.log(`  range:     ${options.min}..${options.max}`);
	console.log("");
	runIndex = 0;
	while (runIndex < options.runs)
	{
		const sample = makeUniqueSample(options.size, options.min, options.max);
		const run = runBinary(pushSwapPath, sample.map(String), "");
		const operations = parseOperations(run.stdout);
		let verdict = "SKIPPED";

		if (run.status !== 0)
		{
			console.error(`Run ${runIndex + 1}: push_swap exited with status ${run.status}`);
			console.error(run.stderr.trim());
			process.exit(1);
		}
		validateOperations(operations);
		verdict = checkerVerdict(checkerPath, sample, operations);
		if (verdict !== "SKIPPED" && verdict !== "OK")
		{
			console.error(`Run ${runIndex + 1}: checker verdict = ${verdict}`);
			console.error(`Input: ${formatSample(sample)}`);
			console.error(`Operations: ${operations.join(" ")}`);
			process.exit(1);
		}
		opCounts.push(operations.length);
		if (!bestTrace || operations.length < bestTrace.operations.length)
		{
			bestTrace = { sample, operations };
		}
		if (!options.quiet)
		{
			console.log(
				`Run ${String(runIndex + 1).padStart(3, "0")}: ${String(operations.length).padStart(5, " ")} ops   checker=${verdict}`
			);
		}
		runIndex++;
	}
	const summary = {
		averageOps: average(opCounts),
		minOps: Math.min(...opCounts),
		maxOps: Math.max(...opCounts),
		scoreBand: scoreBand(options.size, Math.max(...opCounts)),
	};

	console.log("");
	console.log("Summary");
	console.log(`  average ops: ${summary.averageOps.toFixed(2)}`);
	console.log(`  min ops:     ${summary.minOps}`);
	console.log(`  max ops:     ${summary.maxOps}`);
	console.log(`  score band:  ${summary.scoreBand}`);
	if (options.exportTrace && bestTrace)
	{
		exportTrace(options.exportTrace, bestTrace.sample, bestTrace.operations, options, summary);
		console.log(`  trace saved: ${resolve(options.exportTrace)}`);
	}
}

try
{
	main();
}
catch (error)
{
	console.error(`Error: ${error.message}`);
	process.exit(1);
}
