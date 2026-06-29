#!/usr/bin/env node

import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ANSI = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	magenta: "\x1b[35m",
	white: "\x1b[97m",
};

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

const OP_DESCRIPTIONS = {
	sa: "swap top 2 of A",
	sb: "swap top 2 of B",
	ss: "swap both stacks",
	pa: "push top of B to A",
	pb: "push top of A to B",
	ra: "rotate A upward",
	rb: "rotate B upward",
	rr: "rotate both stacks",
	rra: "reverse rotate A",
	rrb: "reverse rotate B",
	rrr: "reverse rotate both stacks",
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
		debug: false,
		debugDelay: 120,
		debugInput: "",
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
		else if (argv[i] === "--debug")
			options.debug = true;
		else if (argv[i] === "--debug-delay")
			options.debugDelay = Number(argv[++i]);
		else if (argv[i] === "--debug-input")
			options.debugInput = argv[++i];
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
	if (!Number.isInteger(options.debugDelay) || options.debugDelay < 0)
		throw new Error("--debug-delay must be a non-negative integer");
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
  --debug                 Animate one run in the terminal
  --debug-delay <ms>      Delay between debug frames (default: 120)
  --debug-input "<list>"  Space-separated integers for debug mode
  --help, -h              Show this help

Examples:
  node tools/push_swap_tester.mjs --size 100 --runs 50 --grade
  node tools/push_swap_tester.mjs --size 500 --runs 20 --worst-trace visualizer/worst_trace.json
  node tools/push_swap_tester.mjs --preset almost-sorted --size 30 --runs 5 --export-trace visualizer/sample_trace.json
  node tools/push_swap_tester.mjs --size 100 --runs 50 --export-csv bench_100.csv
  node tools/push_swap_tester.mjs --debug --debug-input "5 1 4 2 3"
  node tools/push_swap_tester.mjs --debug --preset reverse --size 20 --debug-delay 80
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
	let temp;

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
		temp = base[left];
		base[left] = base[right];
		base[right] = temp;
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
	let result;
	let verdict;

	if (options.noChecker || !checkerPath || !existsSync(checkerPath))
		return ("SKIPPED");
	result = runBinary(checkerPath, sample.map(String), `${operations.join("\n")}\n`);
	verdict = result.stdout.trim();
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

	ALLOWED_OPS.forEach((op) =>
	{
		counts[op] = 0;
	});
	records.forEach((record) =>
	{
		record.operations.forEach((op) =>
		{
			counts[op]++;
		});
	});
	return (counts);
}

function printOperationMix(counts)
{
	const entries = Object.entries(counts).sort((left, right) =>
	{
		if (right[1] !== left[1])
			return (right[1] - left[1]);
		return (left[0].localeCompare(right[0]));
	});
	const maxCount = Math.max(1, ...entries.map((entry) => entry[1]));

	console.log("");
	console.log("Operation mix");
	entries.forEach(([op, count]) =>
	{
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

	records.forEach((record, index) =>
	{
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

function parseDebugInput(input)
{
	const values = input.trim().split(/[\s,]+/).filter(Boolean).map((token) => Number(token));

	if (!values.length || values.some((value) => !Number.isInteger(value)))
		throw new Error("--debug-input must contain only integers");
	return (values);
}

function applyOperation(op, stackA, stackB)
{
	if (op === "sa" && stackA.length >= 2)
		[stackA[0], stackA[1]] = [stackA[1], stackA[0]];
	else if (op === "sb" && stackB.length >= 2)
		[stackB[0], stackB[1]] = [stackB[1], stackB[0]];
	else if (op === "ss")
	{
		applyOperation("sa", stackA, stackB);
		applyOperation("sb", stackA, stackB);
	}
	else if (op === "pa" && stackB.length)
		stackA.unshift(stackB.shift());
	else if (op === "pb" && stackA.length)
		stackB.unshift(stackA.shift());
	else if (op === "ra" && stackA.length)
		stackA.push(stackA.shift());
	else if (op === "rb" && stackB.length)
		stackB.push(stackB.shift());
	else if (op === "rr")
	{
		applyOperation("ra", stackA, stackB);
		applyOperation("rb", stackA, stackB);
	}
	else if (op === "rra" && stackA.length)
		stackA.unshift(stackA.pop());
	else if (op === "rrb" && stackB.length)
		stackB.unshift(stackB.pop());
	else if (op === "rrr")
	{
		applyOperation("rra", stackA, stackB);
		applyOperation("rrb", stackA, stackB);
	}
}

function isSortedStacks(stackA, stackB)
{
	let index;

	if (stackB.length)
		return (false);
	index = 1;
	while (index < stackA.length)
	{
		if (stackA[index - 1] > stackA[index])
			return (false);
		index++;
	}
	return (true);
}

function sleep(ms)
{
	return (new Promise((resolvePromise) =>
	{
		setTimeout(resolvePromise, ms);
	}));
}

function terminalWidth()
{
	return (process.stdout.columns || 100);
}

function terminalHeight()
{
	return (process.stdout.rows || 30);
}

function colorForRank(rank, total)
{
	const ratio = total <= 1 ? 0 : rank / (total - 1);

	if (ratio < 0.33)
		return (ANSI.green);
	if (ratio < 0.66)
		return (ANSI.yellow);
	return (ANSI.red);
}

function renderStackLines(stack, label, rankMap, totalCount, maxHeight, columnWidth)
{
	const lines = [];
	let row;

	lines.push(`${ANSI.bold}Stack ${label}${ANSI.reset}`.padEnd(columnWidth, " "));
	lines.push("-".repeat(columnWidth));
	row = 0;
	while (row < maxHeight)
	{
		if (row < stack.length)
		{
			const value = stack[row];
			const rank = rankMap.get(value) ?? 0;
			const barWidth = Math.max(1, Math.round(((rank + 1) / Math.max(totalCount, 1)) * (columnWidth - 14)));
			const marker = row === 0 ? `${ANSI.white}>${ANSI.reset}` : " ";
			const bar = "*".repeat(barWidth).padEnd(columnWidth - 14, " ");
			const number = String(value).padStart(8, " ");
			const color = colorForRank(rank, totalCount);

			lines.push(`${marker} ${color}${bar}${ANSI.reset} ${ANSI.dim}${number}${ANSI.reset}`);
		}
		else
			lines.push(`${ANSI.dim}${".".repeat(columnWidth - 1)}${ANSI.reset}`);
		row++;
	}
	lines.push("-".repeat(columnWidth));
	lines.push(`${ANSI.dim}size: ${stack.length}${ANSI.reset}`.padEnd(columnWidth, " "));
	return (lines);
}

let previousDebugLineCount = 0;

function clearPreviousFrame()
{
	let index;

	index = 0;
	while (index < previousDebugLineCount)
	{
		process.stdout.write("\x1b[1A\x1b[2K");
		index++;
	}
}

function renderDebugFrame(stackA, stackB, operation, stepIndex, totalOps, rankMap)
{
	const frameLines = [];
	const columnWidth = Math.max(28, Math.floor((terminalWidth() - 6) / 2));
	const maxHeight = Math.max(8, Math.min(Math.max(stackA.length, stackB.length), terminalHeight() - 12));
	const leftLines = renderStackLines(stackA, "A", rankMap, rankMap.size, maxHeight, columnWidth);
	const rightLines = renderStackLines(stackB, "B", rankMap, rankMap.size, maxHeight, columnWidth);
	const rowCount = Math.max(leftLines.length, rightLines.length);
	let row;

	if (previousDebugLineCount > 0)
		clearPreviousFrame();
	frameLines.push(
		`${ANSI.bold}${ANSI.cyan}${operation === "init" ? "init" : operation}${ANSI.reset} ` +
		`${ANSI.dim}${operation === "init" ? "initial state" : (OP_DESCRIPTIONS[operation] || "")}${ANSI.reset} ` +
		`${ANSI.dim}[step ${stepIndex}/${totalOps}]${ANSI.reset}`
	);
	frameLines.push("");
	row = 0;
	while (row < rowCount)
	{
		frameLines.push(`  ${(leftLines[row] || "").padEnd(columnWidth, " ")}  ${(rightLines[row] || "")}`);
		row++;
	}
	frameLines.push("");
	if (stepIndex === totalOps)
	{
		frameLines.push(
			isSortedStacks(stackA, stackB)
				? `${ANSI.green}${ANSI.bold}[OK] Sorted in ${totalOps} operations${ANSI.reset}`
				: `${ANSI.red}${ANSI.bold}[FAIL] Final state is not sorted${ANSI.reset}`
		);
		frameLines.push("");
	}
	process.stdout.write(frameLines.join("\n") + "\n");
	previousDebugLineCount = frameLines.length + 1;
}

async function runDebugMode(options, pushSwapPath, checkerPath)
{
	const sample = options.debugInput
		? parseDebugInput(options.debugInput)
		: makePresetSample(options);
	const run = runBinary(pushSwapPath, sample.map(String), "");
	const operations = parseOperations(run.stdout);
	const rankMap = new Map([...sample].sort((left, right) => left - right).map((value, index) => [value, index]));
	const stackA = [...sample];
	const stackB = [];
	let stepIndex;

	if (run.stderr.includes("Error"))
		throw new Error("push_swap rejected the debug input");
	if (run.status !== 0)
		throw new Error(`push_swap exited with status ${run.status}`);
	validateOperations(operations);
	console.log("");
	console.log(`${ANSI.bold}${ANSI.cyan}push_swap debug mode${ANSI.reset}`);
	console.log(`${ANSI.dim}input: ${formatSample(sample)}${ANSI.reset}`);
	console.log(`${ANSI.dim}${operations.length} operations, delay ${options.debugDelay}ms${ANSI.reset}`);
	console.log("");
	previousDebugLineCount = 0;
	renderDebugFrame(stackA, stackB, "init", 0, operations.length, rankMap);
	await sleep(Math.max(60, options.debugDelay * 2));
	stepIndex = 0;
	while (stepIndex < operations.length)
	{
		applyOperation(operations[stepIndex], stackA, stackB);
		renderDebugFrame(stackA, stackB, operations[stepIndex], stepIndex + 1, operations.length, rankMap);
		await sleep(options.debugDelay);
		stepIndex++;
	}
	if (!options.noChecker && checkerPath)
	{
		const verdict = checkerVerdict(checkerPath, sample, operations, options);

		console.log(`checker -> ${verdict}`);
	}
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
	if (options.debug)
	{
		void runDebugMode(options, pushSwapPath, checkerPath).catch((error) =>
		{
			console.error(`Error: ${error.message}`);
			process.exit(1);
		});
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

		if (run.stderr.includes("Error"))
		{
			console.error(`Run ${runIndex + 1}: push_swap rejected generated input`);
			process.exit(1);
		}
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
