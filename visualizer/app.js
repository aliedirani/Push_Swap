const SAMPLE_TRACE_URL = "./sample_trace.json";
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

const elements = {
	inputValues: document.querySelector("#inputValues"),
	operations: document.querySelector("#operations"),
	loadManual: document.querySelector("#loadManual"),
	loadSample: document.querySelector("#loadSample"),
	traceFile: document.querySelector("#traceFile"),
	stackA: document.querySelector("#stackA"),
	stackB: document.querySelector("#stackB"),
	stepValue: document.querySelector("#stepValue"),
	moveValue: document.querySelector("#moveValue"),
	sortedValue: document.querySelector("#sortedValue"),
	toStart: document.querySelector("#toStart"),
	prevStep: document.querySelector("#prevStep"),
	playPause: document.querySelector("#playPause"),
	nextStep: document.querySelector("#nextStep"),
	toEnd: document.querySelector("#toEnd"),
	speed: document.querySelector("#speed"),
	soundToggle: document.querySelector("#soundToggle"),
	opTimeline: document.querySelector("#opTimeline"),
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
};

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

function buildHistory(values, operations)
{
	const history = [{
		op: "start",
		stacks: createInitialStacks(values),
	}];

	operations.forEach((op) =>
	{
		history.push({
			op,
			stacks: applyOperation(history[history.length - 1].stacks, op),
		});
	});
	return (history);
}

function isSortedAscending(values)
{
	let index = 1;

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

function renderStack(container, values, rankMap, total)
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

		item.className = "stack-item";
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
		chip.addEventListener("click", () => setStep(index + 1, false));
		elements.opTimeline.appendChild(chip);
	});
}

function render()
{
	if (!state.history.length)
		return ;
	const snapshot = state.history[state.currentStep];
	const rankMap = getSortedRanks(state.input);
	const sorted = isSortedAscending(snapshot.stacks.a) && snapshot.stacks.b.length === 0;

	renderStack(elements.stackA, snapshot.stacks.a, rankMap, state.input.length);
	renderStack(elements.stackB, snapshot.stacks.b, rankMap, state.input.length);
	elements.stepValue.textContent = `${state.currentStep} / ${state.operations.length}`;
	elements.moveValue.textContent = snapshot.op;
	elements.sortedValue.textContent = sorted ? "sorted" : "in progress";
	renderTimeline();
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
	{
		playStepSound(state.history[clamped].op);
		if (clamped === state.operations.length)
			playCompletionJingle();
	}
}

function loadTrace(values, operations)
{
	state.input = values;
	state.operations = operations;
	state.history = buildHistory(values, operations);
	state.currentStep = 0;
	stopPlayback();
	render();
	elements.inputValues.value = values.join(" ");
	elements.operations.value = operations.join("\n");
}

function loadManualTrace()
{
	try
	{
		loadTrace(parseNumbers(elements.inputValues.value), parseOperations(elements.operations.value));
	}
	catch (error)
	{
		window.alert(error.message);
	}
}

async function loadSampleTrace()
{
	try
	{
		const response = await fetch(SAMPLE_TRACE_URL);
		const payload = await response.json();

		loadTrace(payload.input, payload.operations);
	}
	catch (error)
	{
		window.alert(`Could not load sample trace: ${error.message}`);
	}
}

function readTraceFile(file)
{
	const reader = new FileReader();

	reader.addEventListener("load", () =>
	{
		try
		{
			const payload = JSON.parse(reader.result);
			loadTrace(parseNumbers(payload.input.join(" ")), parseOperations(payload.operations.join("\n")));
		}
		catch (error)
		{
			window.alert(`Invalid trace file: ${error.message}`);
		}
	});
	reader.readAsText(file);
}

elements.loadManual.addEventListener("click", loadManualTrace);
elements.loadSample.addEventListener("click", () => loadSampleTrace());
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

elements.playPause.addEventListener("click", () =>
{
	if (!state.history.length)
	{
		window.alert("Load a trace first.");
		return ;
	}
	state.playing = !state.playing;
	render();
	if (state.playing)
		schedulePlayback();
	else
		stopPlayback();
});

elements.soundToggle.addEventListener("click", () =>
{
	state.soundEnabled = !state.soundEnabled;
	if (state.soundEnabled)
		ensureAudio();
	render();
});

loadTrace([3, 2, 1], ["sa", "rra"]);
