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
		verbose: false,
		noChecker: false,
		exportTrace: "",
		worstTrace: "",
		exportCsv: "",
		preset: "random",
		grade: false,
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
		else if (argv[i] === "--worst-trace")
			options.worstTrace = argv[++i];
		else if (argv[i] === "--export-csv")
			options.exportCsv = argv[++i];
		else if (argv[i] === "--preset")
			options.preset = argv[++i];
		else if (argv[i] === "--grade")
			options.grade = true;
		else if (argv[i] === "--quiet")
			options.quiet = true;
		else if (argv[i] === "--verbose")
			options.verbose = true;
		else if (argv[i] === "--no-checker")
			options.noChecker = true;
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
	if (!["random", "sorted", "reverse", "almost-sorted"].includes(options.preset))
	{
		throw new Error(
			"--preset must be one of: random, sorted, reverse, almost-sorted"
		);
	}
	return (options);
}

function printHelp()
{
	console.log(`push_swap tester

Usage:
  node tools/push_swap_tester.mjs [options]

Options:
  --push-swap <path>      Path to push_swap binary (default: ./push_swap)
  --checker <path>        Path to checker binary   (default: ./checker)
  --size <n>              Number count per run     (default: 100)
  --runs <n>              Number of generated runs (default: 25)
  --min <n>               Minimum random value
  --max <n>               Maximum random value
  --preset <name>         random | sorted | reverse | almost-sorted
  --grade                 Print 42-style grading guidance for size 100/500
  --export-trace <file>   Export the best run as JSON
  --worst-trace <file>    Export the worst run as JSON
  --export-csv <file>     Export every run as CSV
  --no-checker            Skip checker verification
  --quiet                 Hide per-run output
  --verbose               Print input samples during runs
  --help, -h              Show this help

Examples:
  node tools/push_swap_tester.mjs --size 100 --runs 50 --grade
  node tools/push_swap_tester.mjs --size 500 --runs 20 --worst-trace visualizer/worst_trace.json
  node tools/push_swap_tester.mjs --preset almost-sorted --size 30 --runs 5 --export-trace visualizer/sample_trace.json
  node tools/push_swap_tester.mjs --size 100 --runs 50 --export-csv bench_100.csv
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

function shuffle(values)
{
	let i;
	let j;
	let temp;

	i = values.length - 1;
	while (i > 0)
	{
		j = Math.floor(Math.random() * (i + 1));
		temp = values[i];
		values[i] = values[j];
		values[j] = temp;
		i--;
	}
}

function makeBaseSample(size, min, max)
{
	const pool = [];
	let current;

	current = min;
	while (current <= max)
	{
		pool.push(current);
		current++;
	}
	shuffle(pool);
	return (pool.slice(0, size));
}

function makePresetSample(options)
{
	const base = makeBaseSample(options.size, options.min, options.max);
	let swaps;
	let i;
	let left;
	let right;
	let tmp;

	if (options.preset === "random")
		return (base);
	base.sort((a, b) => a - b);
	if (options.preset === "sorted")
		return (base);
	if (options.preset === "reverse")
		return (base.reverse());
	swaps = Math.max(1, Math.floor(options.size * 0.08));
	i = 0;
	while (i < swaps)
	{
		left = Math.floor(Math.random() * Math.max(options.size - 1, 1));
		right = Math.min(left + 1 + Math.floor(Math.random() * 2), options.size - 1);
		tmp = base[left];
		base[left] = base[right];
		base[right] = tmp;
		i++;
	}
	return (base);
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
	let i;

	i = 0;
	while (i < operations.length)
	{
		if (!ALLOWED_OPS.has(operations[i]))
			throw new Error(`Unknown operation emitted by push_swap: ${operations[i]}`);
		i++;
	}
}

function checkerVerdict(checkerPath, sample, operations, options)
{
	if (options.noChecker || !checkerPath)
		return ("SKIPPED");
	const result = runBinary(checkerPath, sample.map(String), `${operations.join("\n")}\n`);
	const verdict = result.stdout.trim();

	if (result.status !== 0 && verdict !== "Error")
		throw new Error(`checker exited with status ${result.status}\n${result.stderr}`);
	return (verdict || "(no output)");
}

function average(values)
{
	return (values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentile(values, ratio)
{
	const sorted = [...values].sort((a, b) => a - b);
	const index = (sorted.length - 1) * ratio;
	const lower = Math.floor(index);
	const upper = Math.ceil(index);
	const weight = index - lower;

	if (sorted.length === 1)
		return (sorted[0]);
	if (lower === upper)
		return (sorted[lower]);
	return (sorted[lower] * (1 - weight) + sorted[upper] * weight);
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

function gradeSummary(size, maxOperations)
{
	const limits = GRADE_LIMITS[size];
	let i;

	if (!limits)
		return (null);
	i = 0;
	while (i < limits.length)
	{
		if (maxOperations < limits[i])
		{
			return ({
				emoji: i === 0 ? "[OK]" : "[WARN]",
				label: i === 0 ? "full-score band" : "partial-score band",
				threshold: `< ${limits[i]} ops`,
				score: `${5 - i}/5`,
			});
		}
		i++;
	}
	return ({
		emoji: "[FAIL]",
		label: "outside grading bands",
		threshold: `>= ${limits[limits.length - 1]} ops`,
		score: "0/5",
	});
}

function buildFrequency(records)
{
	const counts = {};

	ALLOWED_OPS.forEach((op) => {
		counts[op] = 0;
	});
	records.forEach((record) => {
		record.operations.forEach((op) => {
			counts[op]++;
		});
	});
	return (counts);
}

function printOperationMix(counts)
{
	const entries = Object.entries(counts).sort((left, right) => {
		if (right[1] !== left[1])
			return (right[1] - left[1]);
		return (left[0].localeCompare(right[0]));
	});
	const maxCount = Math.max(1, ...entries.map((entry) => entry[1]));

	console.log("");
	console.log("Operation mix");
	entries.forEach(([op, count]) => {
		const width = count === 0 ? 0 : Math.max(1, Math.round((count / maxCount) * 20));
		const bar = "#".repeat(width).padEnd(20, " ");

		console.log(`  ${op.padEnd(4)} ${bar} ${count}`);
	});
}

function exportTrace(filePath, sample, operations, options, summary, kind)
{
	const payload = {
		title: `push_swap ${kind} trace (${sample.length} values)`,
		input: sample,
		operations,
		meta: {
			pushSwap: options.pushSwap,
			checker: options.noChecker ? "(skipped)" : options.checker,
			opCount: operations.length,
			runs: options.runs,
			size: options.size,
			min: options.min,
			max: options.max,
			preset: options.preset,
			averageOps: summary.averageOps,
			maxOps: summary.maxOps,
			minOps: summary.minOps,
			p50: summary.p50,
			p95: summary.p95,
			p99: summary.p99,
			scoreBand: summary.scoreBand,
			traceKind: kind,
			createdAt: new Date().toISOString(),
		},
	};
	const resolved = resolve(filePath);

	mkdirSync(dirname(resolved), { recursive: true });
	writeFileSync(resolved, JSON.stringify(payload, null, 2));
}

function csvEscape(value)
{
	const stringValue = String(value).replace(/"/g, "\"\"");

	return (`"${stringValue}"`);
}

function exportCsv(filePath, records, options)
{
	const rows = [
		["run", "size", "preset", "op_count", "checker", "input"],
	];
	const resolved = resolve(filePath);

	records.forEach((record, index) => {
		rows.push([
			index + 1,
			options.size,
			options.preset,
			record.opCount,
			record.verdict,
			record.sample.join(" "),
		]);
	});
	mkdirSync(dirname(resolved), { recursive: true });
	writeFileSync(
		resolved,
		rows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n"
	);
}

function formatSample(sample)
{
	return (sample.join(" "));
}

function main()
{
	const options = parseArgs(process.argv.slice(2));
	const pushSwapPath = resolveBinaryPath(options.pushSwap);
	const checkerPath = options.noChecker ? "" : resolveBinaryPath(options.checker);
	const records = [];
	const opCounts = [];
	let runIndex;
	let bestRun;
	let worstRun;
	let summary;
	let grade;
	let frequency;

	if (options.help)
	{
		printHelp();
		return ;
	}
	console.log("push_swap tester");
	console.log(`  push_swap: ${pushSwapPath}`);
	console.log(`  checker:   ${options.noChecker ? "(skipped)" : checkerPath}`);
	console.log(`  runs:      ${options.runs}`);
	console.log(`  size:      ${options.size}`);
	console.log(`  range:     ${options.min}..${options.max}`);
	console.log(`  preset:    ${options.preset}`);
	console.log("");
	runIndex = 0;
	while (runIndex < options.runs)
	{
		const sample = makePresetSample(options);
		const run = runBinary(pushSwapPath, sample.map(String), "");
		const operations = parseOperations(run.stdout);
		let verdict;
		let line;

		if (run.status !== 0)
		{
			console.error(`Run ${runIndex + 1}: push_swap exited with status ${run.status}`);
			console.error(run.stderr.trim());
			process.exit(1);
		}
		validateOperations(operations);
		verdict = checkerVerdict(checkerPath, sample, operations, options);
		if (verdict !== "SKIPPED" && verdict !== "OK")
		{
			console.error(`Run ${runIndex + 1}: checker verdict = ${verdict}`);
			console.error(`Input: ${formatSample(sample)}`);
			console.error(`Operations: ${operations.join(" ")}`);
			process.exit(1);
		}
		records.push({
			sample,
			operations,
			opCount: operations.length,
			verdict,
		});
		opCounts.push(operations.length);
		if (!bestRun || operations.length < bestRun.opCount)
			bestRun = records[records.length - 1];
		if (!worstRun || operations.length > worstRun.opCount)
			worstRun = records[records.length - 1];
		if (!options.quiet)
		{
			line = `Run ${String(runIndex + 1).padStart(3, "0")}: ${String(operations.length).padStart(5, " ")} ops   checker=${verdict}`;
			if (options.verbose)
				line += `   input=${formatSample(sample)}`;
			console.log(line);
		}
		runIndex++;
	}
	summary = {
		averageOps: average(opCounts),
		minOps: Math.min(...opCounts),
		maxOps: Math.max(...opCounts),
		p50: percentile(opCounts, 0.5),
		p95: percentile(opCounts, 0.95),
		p99: percentile(opCounts, 0.99),
		scoreBand: scoreBand(options.size, Math.max(...opCounts)),
		totalOps: opCounts.reduce((sum, value) => sum + value, 0),
	};
	grade = gradeSummary(options.size, summary.maxOps);
	frequency = buildFrequency(records);
	console.log("");
	console.log("Summary");
	console.log(`  average ops: ${summary.averageOps.toFixed(2)}`);
	console.log(`  min ops:     ${summary.minOps}`);
	console.log(`  max ops:     ${summary.maxOps}`);
	console.log(`  p50:         ${summary.p50.toFixed(2)}`);
	console.log(`  p95:         ${summary.p95.toFixed(2)}`);
	console.log(`  p99:         ${summary.p99.toFixed(2)}`);
	console.log(`  score band:  ${summary.scoreBand}`);
	console.log(`  total ops:   ${summary.totalOps}`);
	if (options.grade && grade)
	{
		console.log("");
		console.log("42 grading view");
		console.log(`  ${grade.emoji} ${grade.label}`);
		console.log(`  threshold:   ${grade.threshold}`);
		console.log(`  max-based:   ${grade.score}`);
	}
	printOperationMix(frequency);
	if (options.exportTrace && bestRun)
	{
		exportTrace(
			options.exportTrace,
			bestRun.sample,
			bestRun.operations,
			options,
			summary,
			"best"
		);
		console.log("");
		console.log(`  best trace:  ${resolve(options.exportTrace)}`);
	}
	if (options.worstTrace && worstRun)
	{
		exportTrace(
			options.worstTrace,
			worstRun.sample,
			worstRun.operations,
			options,
			summary,
			"worst"
		);
		console.log(`  worst trace: ${resolve(options.worstTrace)}`);
	}
	if (options.exportCsv)
	{
		exportCsv(options.exportCsv, records, options);
		console.log(`  csv export:  ${resolve(options.exportCsv)}`);
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
