const SAMPLE_TRACE = {
	title: "Sample push_swap trace",
	input: [3, 2, 1],
	operations: ["sa", "rra"],
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

const HISTOGRAM_ORDER = [
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
];

const DEFAULT_SERVER_ORIGIN = window.location.protocol === "file:"
	? "http://127.0.0.1:3000"
	: window.location.origin;

const elements = {
	inputValues: document.querySelector("#inputValues"),
	operations: document.querySelector("#operations"),
	loadManual: document.querySelector("#loadManual"),
	loadSample: document.querySelector("#loadSample"),
	traceFile: document.querySelector("#traceFile"),
	dropZone: document.querySelector("#dropZone"),
	stackA: document.querySelector("#stackA"),
	stackB: document.querySelector("#stackB"),
	stepValue: document.querySelector("#stepValue"),
	moveValue: document.querySelector("#moveValue"),
	progressValue: document.querySelector("#progressValue"),
	sortedValue: document.querySelector("#sortedValue"),
	chunkInfo: document.querySelector("#chunkInfo"),
	traceMeta: document.querySelector("#traceMeta"),
	serverBadge: document.querySelector("#serverBadge"),
	liveCard: document.querySelector("#liveCard"),
	liveStatusLabel: document.querySelector("#liveStatusLabel"),
	liveSize: document.querySelector("#liveSize"),
	livePreset: document.querySelector("#livePreset"),
	liveGenerate: document.querySelector("#liveGenerate"),
	liveInput: document.querySelector("#liveInput"),
	liveRunCustom: document.querySelector("#liveRunCustom"),
	liveMessage: document.querySelector("#liveMessage"),
	toStart: document.querySelector("#toStart"),
	prevStep: document.querySelector("#prevStep"),
	playPause: document.querySelector("#playPause"),
	nextStep: document.querySelector("#nextStep"),
	toEnd: document.querySelector("#toEnd"),
	speed: document.querySelector("#speed"),
	scrubber: document.querySelector("#scrubber"),
	scrubberLabel: document.querySelector("#scrubberLabel"),
	soundToggle: document.querySelector("#soundToggle"),
	opTimeline: document.querySelector("#opTimeline"),
	opHistogram: document.querySelector("#opHistogram"),
};

const state = {
	input: [],
	operations: [],
	history: [],
	currentStep: 0,
	playing: false,
	timer: null,
	soundEnabled: true,
	audioContext: null,
	lastSoundAt: 0,
	traceDetails: {
		title: SAMPLE_TRACE.title,
		meta: null,
	},
	serverOrigin: DEFAULT_SERVER_ORIGIN,
	serverOnline: false,
};

function getChunkSize(total)
{
	if (total <= 10)
		return (2);
	if (total <= 100)
		return (15);
	if (total <= 500)
		return (32);
	return (45);
}

function parseNumbers(text)
{
	if (!text.trim())
		throw new Error("Please provide at least one input value.");
	const values = text
		.split(/[\s,]+/)
		.filter(Boolean)
		.map((token) => Number(token));
	const seen = new Set();

	values.forEach((value) =>
	{
		if (!Number.isInteger(value))
			throw new Error("All input values must be integers.");
		if (seen.has(value))
			throw new Error("Duplicate values are not allowed in the visualizer trace.");
		seen.add(value);
	});
	return (values);
}

function parseOperations(text)
{
	if (!text.trim())
		return ([]);
	const ops = text
		.split(/\r?\n|\s+/)
		.map((value) => value.trim())
		.filter(Boolean);

	ops.forEach((op) =>
	{
		if (!ALLOWED_OPS.has(op))
			throw new Error(`Unknown operation: ${op}`);
	});
	return (ops);
}

function normalizePayload(payload)
{
	const input = Array.isArray(payload.input)
		? payload.input.join(" ")
		: String(payload.input ?? "");
	const operations = Array.isArray(payload.operations)
		? payload.operations.join("\n")
		: String(payload.operations ?? "");

	return ({
		title: String(payload.title ?? "Imported trace"),
		meta: payload.meta ?? null,
		values: parseNumbers(input),
		operations: parseOperations(operations),
	});
}

function describeTrace()
{
	const parts = [];
	const meta = state.traceDetails.meta ?? {};
	const title = state.traceDetails.title || "Manual trace";

	parts.push(title);
	if (meta.source)
		parts.push(meta.source);
	if (meta.traceKind)
		parts.push(`${meta.traceKind} export`);
	if (meta.preset)
		parts.push(`preset ${meta.preset}`);
	if (meta.checker && meta.checker !== "(skipped)")
		parts.push(`checker ${meta.checker}`);
	parts.push(`${state.input.length} values`);
	parts.push(`${state.operations.length} ops`);
	return (parts.join(" · "));
}

async function fetchWithTimeout(url, options, timeoutMs)
{
	const controller = new AbortController();
	const timer = window.setTimeout(() => controller.abort(), timeoutMs);

	try
	{
		return (await fetch(url, { ...options, signal: controller.signal }));
	}
	finally
	{
		window.clearTimeout(timer);
	}
}

function createInitialStacks(values)
{
	return ({
		a: [...values],
		b: [],
	});
}

function cloneStacks(stacks)
{
	return ({
		a: [...stacks.a],
		b: [...stacks.b],
	});
}

function swapTop(stack)
{
	if (stack.length < 2)
		return ;
	[stack[0], stack[1]] = [stack[1], stack[0]];
}

function push(src, dst)
{
	if (!src.length)
		return ;
	dst.unshift(src.shift());
}

function rotate(stack)
{
	if (stack.length < 2)
		return ;
	stack.push(stack.shift());
}

function reverseRotate(stack)
{
	if (stack.length < 2)
		return ;
	stack.unshift(stack.pop());
}

function applyOperation(stacks, op)
{
	const next = cloneStacks(stacks);

	if (op === "sa")
		swapTop(next.a);
	else if (op === "sb")
		swapTop(next.b);
	else if (op === "ss")
	{
		swapTop(next.a);
		swapTop(next.b);
	}
	else if (op === "pa")
		push(next.b, next.a);
	else if (op === "pb")
		push(next.a, next.b);
	else if (op === "ra")
		rotate(next.a);
	else if (op === "rb")
		rotate(next.b);
	else if (op === "rr")
	{
		rotate(next.a);
		rotate(next.b);
	}
	else if (op === "rra")
		reverseRotate(next.a);
	else if (op === "rrb")
		reverseRotate(next.b);
	else if (op === "rrr")
	{
		reverseRotate(next.a);
		reverseRotate(next.b);
	}
	return (next);
}

function makeMeta(stacks, inputSize, phase, nextIndex, chunkSize)
{
	let low;
	let high;

	low = null;
	high = null;
	if (phase === "phase1")
	{
		low = nextIndex;
		high = Math.min(nextIndex + chunkSize, inputSize - 1);
	}
	return ({
		phase,
		nextIndex,
		chunkSize,
		windowLow: low,
		windowHigh: high,
	});
}

function buildHistory(values, operations)
{
	const history = [];
	const chunkSize = getChunkSize(values.length);
	let stacks = createInitialStacks(values);
	let nextIndex = 0;
	let phase;

	phase = values.length > 5 ? "phase1" : "mini-sort";
	history.push({
		op: "start",
		stacks: cloneStacks(stacks),
		meta: makeMeta(stacks, values.length, phase, nextIndex, chunkSize),
	});
	operations.forEach((op) =>
	{
		stacks = applyOperation(stacks, op);
		if (phase === "phase1" && op === "pb")
			nextIndex++;
		if (phase === "phase1" && stacks.a.length === 0)
			phase = "phase2";
		history.push({
			op,
			stacks: cloneStacks(stacks),
			meta: makeMeta(stacks, values.length, phase, nextIndex, chunkSize),
		});
	});
	return (history);
}

function isSortedAscending(values)
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

function getSortedRanks(values)
{
	const sorted = [...values].sort((a, b) => a - b);
	const rankMap = new Map();

	sorted.forEach((value, index) => rankMap.set(value, index));
	return (rankMap);
}

function colorForValue(value, rankMap, total)
{
	const rank = rankMap.get(value) ?? 0;
	const hue = Math.round((rank / Math.max(total - 1, 1)) * 220);

	return (`linear-gradient(135deg, hsl(${hue + 10} 78% 42%), hsl(${hue + 42} 76% 58%))`);
}

function widthForValue(value, rankMap, total)
{
	const rank = rankMap.get(value) ?? 0;
	const ratio = total <= 1 ? 1 : rank / (total - 1);

	return (48 + ratio * 50);
}

function renderStack(container, values, rankMap, total, window)
{
	container.textContent = "";
	if (!values.length)
	{
		const empty = document.createElement("div");
		empty.className = "stack-empty";
		empty.textContent = "empty";
		container.appendChild(empty);
		return ;
	}
	values.forEach((value) =>
	{
		const item = document.createElement("div");
		const span = document.createElement("span");
		const rank = rankMap.get(value) ?? 0;

		item.className = "stack-item";
		if (window && rank >= window.low && rank <= window.high)
			item.classList.add("active-window");
		item.style.background = colorForValue(value, rankMap, total);
		item.style.width = `${widthForValue(value, rankMap, total)}%`;
		span.textContent = value;
		item.appendChild(span);
		container.appendChild(item);
	});
}

function renderTimeline()
{
	elements.opTimeline.textContent = "";
	if (!state.operations.length)
	{
		const chip = document.createElement("div");
		chip.className = "op-chip";
		chip.textContent = "No moves loaded yet";
		elements.opTimeline.appendChild(chip);
		return ;
	}
	state.operations.forEach((op, index) =>
	{
		const chip = document.createElement("button");

		chip.type = "button";
		chip.className = "op-chip";
		if (index + 1 < state.currentStep)
			chip.classList.add("done");
		if (index + 1 === state.currentStep)
			chip.classList.add("active");
		chip.textContent = `${index + 1}. ${op}`;
		chip.addEventListener("click", () =>
		{
			stopPlayback();
			setStep(index + 1, false);
		});
		elements.opTimeline.appendChild(chip);
	});
}

function renderHistogram()
{
	const counts = Object.fromEntries(HISTOGRAM_ORDER.map((op) => [op, 0]));
	const played = state.operations.slice(0, state.currentStep);
	const maxCount = Math.max(1, ...played.map((op) => counts[op] ?? 0), played.length ? 0 : 0);

	elements.opHistogram.textContent = "";
	played.forEach((op) =>
	{
		counts[op]++;
	});
	HISTOGRAM_ORDER.forEach((op) =>
	{
		const col = document.createElement("div");
		const count = document.createElement("div");
		const shell = document.createElement("div");
		const bar = document.createElement("div");
		const label = document.createElement("div");
		const ratio = counts[op] / Math.max(1, ...Object.values(counts));

		col.className = "hist-col";
		count.className = "hist-count";
		shell.className = "hist-bar-shell";
		bar.className = "hist-bar";
		label.className = "hist-label";
		count.textContent = counts[op];
		bar.style.height = `${Math.max(6, ratio * 100)}%`;
		label.textContent = op;
		shell.appendChild(bar);
		col.appendChild(count);
		col.appendChild(shell);
		col.appendChild(label);
		elements.opHistogram.appendChild(col);
	});
}

function render()
{
	if (!state.history.length)
		return ;
	const snapshot = state.history[state.currentStep];
	const rankMap = getSortedRanks(state.input);
	const sorted = isSortedAscending(snapshot.stacks.a) && snapshot.stacks.b.length === 0;
	const progress = state.operations.length
		? (state.currentStep / state.operations.length) * 100
		: 100;
	let window;
	let statusLabel;

	window = null;
	if (snapshot.meta.phase === "phase1")
	{
		window = {
			low: snapshot.meta.windowLow,
			high: snapshot.meta.windowHigh,
		};
	}
	if (sorted)
		statusLabel = "sorted";
	else if (snapshot.meta.phase === "phase1")
		statusLabel = "phase 1";
	else if (snapshot.meta.phase === "phase2")
		statusLabel = "phase 2";
	else
		statusLabel = "mini-sort";
	renderStack(elements.stackA, snapshot.stacks.a, rankMap, state.input.length, window);
	renderStack(elements.stackB, snapshot.stacks.b, rankMap, state.input.length, null);
	elements.stepValue.textContent = `${state.currentStep} / ${state.operations.length}`;
	elements.moveValue.textContent = snapshot.op;
	elements.progressValue.textContent = `${progress.toFixed(1)}%`;
	elements.sortedValue.textContent = statusLabel;
	if (snapshot.meta.phase === "phase1")
	{
		elements.chunkInfo.textContent =
			`Butterfly phase 1 · active chunk window [${snapshot.meta.windowLow}..${snapshot.meta.windowHigh}]`;
	}
	else if (snapshot.meta.phase === "phase2")
	{
		elements.chunkInfo.textContent =
			"Butterfly phase 2 · rotating max values out of stack B and pushing them back to A";
	}
	else
	{
		elements.chunkInfo.textContent =
			"Mini-sort path · direct small-stack strategy for tiny inputs";
	}
	elements.traceMeta.textContent = describeTrace();
	elements.scrubber.max = String(state.operations.length);
	elements.scrubber.value = String(state.currentStep);
	elements.scrubberLabel.textContent = `${progress.toFixed(1)}%`;
	renderTimeline();
	renderHistogram();
	elements.playPause.textContent = state.playing ? "Pause" : "Play";
	elements.soundToggle.textContent = state.soundEnabled ? "Sound on" : "Sound off";
}

function ensureAudio()
{
	if (!state.audioContext)
		state.audioContext = new window.AudioContext();
	if (state.audioContext.state === "suspended")
		state.audioContext.resume();
}

function playTone(frequency, duration, type)
{
	if (!state.soundEnabled)
		return ;
	ensureAudio();
	const oscillator = state.audioContext.createOscillator();
	const gain = state.audioContext.createGain();
	const now = state.audioContext.currentTime;

	oscillator.type = type;
	oscillator.frequency.setValueAtTime(frequency, now);
	gain.gain.setValueAtTime(0.0001, now);
	gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
	oscillator.connect(gain);
	gain.connect(state.audioContext.destination);
	oscillator.start(now);
	oscillator.stop(now + duration + 0.01);
}

function playStepSound(op)
{
	const now = performance.now();

	if (!state.soundEnabled || now - state.lastSoundAt < 40)
		return ;
	state.lastSoundAt = now;
	if (op.startsWith("p"))
		playTone(220, 0.11, "triangle");
	else if (op.startsWith("s"))
		playTone(320, 0.1, "square");
	else if (op.startsWith("rr"))
		playTone(560, 0.12, "sawtooth");
	else if (op.startsWith("r"))
		playTone(430, 0.11, "sine");
}

function playCompletionJingle()
{
	if (!state.soundEnabled)
		return ;
	ensureAudio();
	[523.25, 659.25, 783.99].forEach((note, index) =>
	{
		window.setTimeout(() => playTone(note, 0.18, "triangle"), index * 120);
	});
}

function stopPlayback()
{
	if (state.timer)
		window.clearTimeout(state.timer);
	state.timer = null;
	state.playing = false;
	render();
}

function schedulePlayback()
{
	if (!state.playing)
		return ;
	if (state.currentStep >= state.operations.length)
	{
		stopPlayback();
		playCompletionJingle();
		return ;
	}
	state.timer = window.setTimeout(() =>
	{
		setStep(state.currentStep + 1, true);
		schedulePlayback();
	}, Number(elements.speed.value));
}

function setStep(nextStep, withSound)
{
	const clamped = Math.max(0, Math.min(nextStep, state.operations.length));
	const previousStep = state.currentStep;

	state.currentStep = clamped;
	render();
	if (withSound && clamped > previousStep)
		playStepSound(state.history[clamped].op);
}

function loadTrace(values, operations, details)
{
	if (state.timer)
		window.clearTimeout(state.timer);
	state.playing = false;
	state.input = values;
	state.operations = operations;
	state.history = buildHistory(values, operations);
	state.currentStep = 0;
	state.traceDetails = {
		title: details?.title || "Manual trace",
		meta: details?.meta ?? null,
	};
	elements.inputValues.value = values.join(" ");
	elements.operations.value = operations.join("\n");
	render();
}

function loadManualTrace()
{
	try
	{
		loadTrace(
			parseNumbers(elements.inputValues.value),
			parseOperations(elements.operations.value),
			{ title: "Manual trace", meta: null }
		);
	}
	catch (error)
	{
		window.alert(error.message);
	}
}

function loadPayload(payload)
{
	const normalized = normalizePayload(payload);

	loadTrace(normalized.values, normalized.operations, normalized);
}

function readTraceFile(file)
{
	const reader = new FileReader();

	reader.addEventListener("load", () =>
	{
		try
		{
			loadPayload(JSON.parse(reader.result));
		}
		catch (error)
		{
			window.alert(`Invalid trace file: ${error.message}`);
		}
	});
	reader.readAsText(file);
}

function setLiveMessage(message, tone)
{
	elements.liveMessage.textContent = message;
	elements.liveMessage.classList.remove("is-good", "is-bad");
	if (tone === "good")
		elements.liveMessage.classList.add("is-good");
	if (tone === "bad")
		elements.liveMessage.classList.add("is-bad");
}

async function checkServer()
{
	try
	{
		const response = await fetchWithTimeout(`${state.serverOrigin}/status`, {}, 2000);
		const payload = await response.json();

		if (!response.ok)
			throw new Error(payload.error || "status request failed");
		state.serverOnline = true;
		elements.serverBadge.textContent = "Live bridge online";
		elements.serverBadge.className = "server-pill online";
		elements.liveCard.classList.remove("is-hidden");
		elements.liveStatusLabel.textContent = payload.pushSwap.exists ? "Ready to run" : "Build needed";
		if (payload.pushSwap.exists)
		{
			setLiveMessage(
				`Server ready at ${state.serverOrigin}. Generate a case or run a custom input.`,
				"good"
			);
		}
		else
		{
			setLiveMessage(
				`push_swap was not found at ${payload.pushSwap.path}. Run make first.`,
				"bad"
			);
		}
	}
	catch
	{
		state.serverOnline = false;
		elements.serverBadge.textContent = "Live bridge offline";
		elements.serverBadge.className = "server-pill offline";
		elements.liveCard.classList.add("is-hidden");
		elements.liveStatusLabel.textContent = "Server offline";
	}
}

async function runLiveInput(input, preset)
{
	if (!state.serverOnline)
	{
		setLiveMessage("Start node tools/visualizer_server.mjs first.", "bad");
		return ;
	}
	setLiveMessage("Running push_swap through the live bridge...");
	try
	{
		const response = await fetchWithTimeout(`${state.serverOrigin}/run`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				input,
				preset,
			}),
		}, 20000);
		const payload = await response.json();

		if (!response.ok)
			throw new Error(payload.error || "run failed");
		loadPayload(payload);
		elements.liveInput.value = input.join(" ");
		if (payload.alreadySorted)
			setLiveMessage("Input was already sorted. Trace loaded with 0 operations.", "good");
		else
			setLiveMessage(`Loaded ${payload.totalOps} operations. Checker: ${payload.checker}.`, payload.checker === "OK" ? "good" : "bad");
	}
	catch (error)
	{
		setLiveMessage(`Live run failed: ${error.message}`, "bad");
	}
}

async function handleLiveGenerate()
{
	if (!state.serverOnline)
	{
		setLiveMessage("The live bridge is offline.", "bad");
		return ;
	}
	setLiveMessage("Generating an input from the live bridge...");
	try
	{
		const params = new URLSearchParams({
			size: elements.liveSize.value,
			preset: elements.livePreset.value,
		});
		const response = await fetchWithTimeout(`${state.serverOrigin}/generate?${params.toString()}`, {}, 5000);
		const payload = await response.json();

		if (!response.ok)
			throw new Error(payload.error || "generate failed");
		await runLiveInput(payload.input, payload.preset);
	}
	catch (error)
	{
		setLiveMessage(`Generation failed: ${error.message}`, "bad");
	}
}

async function handleLiveCustomRun()
{
	try
	{
		const values = parseNumbers(elements.liveInput.value);

		await runLiveInput(values, "custom");
	}
	catch (error)
	{
		setLiveMessage(error.message, "bad");
	}
}

function togglePlayPause()
{
	if (!state.history.length)
	{
		window.alert("Load a trace first.");
		return ;
	}
	if (state.currentStep === state.operations.length)
		setStep(0, false);
	state.playing = !state.playing;
	render();
	if (state.playing)
		schedulePlayback();
	else
		stopPlayback();
}

function handleDropZone()
{
	["dragenter", "dragover"].forEach((eventName) =>
	{
		elements.dropZone.addEventListener(eventName, (event) =>
		{
			event.preventDefault();
			elements.dropZone.classList.add("active");
		});
	});
	["dragleave", "dragend", "drop"].forEach((eventName) =>
	{
		elements.dropZone.addEventListener(eventName, (event) =>
		{
			event.preventDefault();
			elements.dropZone.classList.remove("active");
		});
	});
	elements.dropZone.addEventListener("drop", (event) =>
	{
		const file = event.dataTransfer?.files?.[0];

		if (file)
			readTraceFile(file);
	});
}

function bindKeyboardShortcuts()
{
	window.addEventListener("keydown", (event) =>
	{
		const tag = document.activeElement?.tagName;

		if (tag === "TEXTAREA" || tag === "INPUT")
			return ;
		if (event.code === "Space")
		{
			event.preventDefault();
			togglePlayPause();
		}
		else if (event.code === "ArrowLeft")
		{
			event.preventDefault();
			stopPlayback();
			setStep(state.currentStep - 1, false);
		}
		else if (event.code === "ArrowRight")
		{
			event.preventDefault();
			stopPlayback();
			setStep(state.currentStep + 1, true);
		}
		else if (event.code === "KeyR")
		{
			event.preventDefault();
			stopPlayback();
			setStep(0, false);
		}
	});
}

elements.loadManual.addEventListener("click", loadManualTrace);
elements.loadSample.addEventListener("click", () => loadPayload(SAMPLE_TRACE));
elements.liveGenerate.addEventListener("click", () =>
{
	void handleLiveGenerate();
});
elements.liveRunCustom.addEventListener("click", () =>
{
	void handleLiveCustomRun();
});
elements.traceFile.addEventListener("change", (event) =>
{
	const [file] = event.target.files;

	if (file)
		readTraceFile(file);
});
elements.toStart.addEventListener("click", () =>
{
	stopPlayback();
	setStep(0, false);
});
elements.prevStep.addEventListener("click", () =>
{
	stopPlayback();
	setStep(state.currentStep - 1, false);
});
elements.nextStep.addEventListener("click", () =>
{
	stopPlayback();
	setStep(state.currentStep + 1, true);
});
elements.toEnd.addEventListener("click", () =>
{
	stopPlayback();
	setStep(state.operations.length, false);
});
elements.playPause.addEventListener("click", togglePlayPause);
elements.soundToggle.addEventListener("click", () =>
{
	state.soundEnabled = !state.soundEnabled;
	if (state.soundEnabled)
		ensureAudio();
	render();
});
elements.scrubber.addEventListener("input", () =>
{
	stopPlayback();
	setStep(Number(elements.scrubber.value), false);
});

handleDropZone();
bindKeyboardShortcuts();
loadPayload(SAMPLE_TRACE);
void checkServer();
window.setInterval(() =>
{
	void checkServer();
}, 8000);
