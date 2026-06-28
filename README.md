*This project has been created as part of the 42 curriculum by aeldiran.*

# push_swap

A sorting algorithm project for 42 School. Two stacks, eleven operations, one goal: sort integers in as few moves as possible.

**Score: 125 / 125**

---

## How it works

The program receives a list of integers as arguments. It must sort them into ascending order on stack A using only the allowed operations — and print every operation it performs, one per line.

A second program, `checker`, reads those printed operations from stdin, replays them, and confirms the result is sorted (`OK`) or not (`KO`).

---

## Operations

| Operation | Effect |
|-----------|--------|
| `sa` | Swap the top 2 elements of stack A |
| `sb` | Swap the top 2 elements of stack B |
| `ss` | `sa` + `sb` simultaneously |
| `pa` | Push the top of B onto A |
| `pb` | Push the top of A onto B |
| `ra` | Rotate A up — top becomes bottom |
| `rb` | Rotate B up — top becomes bottom |
| `rr` | `ra` + `rb` simultaneously |
| `rra` | Rotate A down — bottom becomes top |
| `rrb` | Rotate B down — bottom becomes top |
| `rrr` | `rra` + `rrb` simultaneously |

---

## Usage

```bash
# Build push_swap
make

# Build the bonus checker
make bonus

# Sort some numbers
./push_swap 3 1 2

# Count how many operations it uses
./push_swap $(shuf -i 1-100 | tr '\n' ' ') | wc -l

# Pass a quoted string
./push_swap "5 4 3 2 1"

# Verify the result with checker
ARG=$(shuf -i 1-500 | tr '\n' ' ')
./push_swap $ARG | ./checker $ARG
```

```bash
make        # build push_swap
make bonus  # build checker
make clean  # remove object files
make fclean # remove objects + binaries
make re     # fclean then build
```

---

## Algorithm

### Small inputs (2–5 elements)

Each size has a dedicated, hand-optimised sort:

- **2 elements** — one conditional `sa`, maximum 1 operation.
- **3 elements** — all six permutations covered by index comparison, maximum 2 operations.
- **4 elements** — rotate the minimum to top, `pb`, sort the 3 remaining, `pa`.
- **5 elements** — same idea, push minimum to B, solve the 4 remaining, `pa`.

### Large inputs (6+ elements) — Butterfly Sort

The main algorithm runs in two phases.

**Phase 1 — push everything to B**

Values are normalised to indices 0 → n−1 before sorting begins, so the algorithm works with positions, not raw values.

A sliding window tracks a `next_index` cursor and a fixed `chunk_size`. On every iteration of the main loop, the element currently at the top of A is checked:

```
index ≤ next_index
    → pb + rb        (push it down into B, advance the cursor)

index ≤ next_index + chunk_size
    → pb             (push it to the top of B, advance the cursor)

otherwise
    → ra             (rotate past it, try the next element)
```

Because lower-half elements are immediately rotated down with `rb`, the upper half of each window naturally clusters near the top of B. This pre-sorts B in a way that minimises phase-2 rotation cost.

**Phase 2 — drain B back to A in sorted order**

While B is not empty:
1. Find the element in B with the highest index (which is the largest unplaced value).
2. Calculate whether rotating forward (`rb`) or backward (`rrb`) costs fewer moves.
3. Rotate B to bring that element to the top.
4. `pa`.

A is filled from largest to smallest, so it ends up in ascending order.

**Chunk sizes** (tuned empirically):

| Input size | Chunk size | Chunks |
|-----------|-----------|--------|
| ≤ 10 | 2 | ~5 |
| ≤ 100 | 15 | ~7 |
| ≤ 500 | 32 | ~16 |

---

## Performance

Tested over 100 random shuffles at each size:

| Elements | Average ops | Maximum ops | Limit for 5 pts | Result |
|----------|------------|------------|-----------------|--------|
| 100 | **~576** | ~620 | < 700 | ✅ 5 / 5 |
| 500 | **~5055** | ~5300 | < 5500 | ✅ 5 / 5 |

---

## Input validation

The program rejects input and prints `Error` to stderr for:

- Non-integer arguments (`abc`, `1.5`, `--`)
- Integers outside the range `INT_MIN` to `INT_MAX`
- Duplicate values
- Empty input or only whitespace

Both space-separated arguments and a single quoted string are accepted:

```bash
./push_swap 5 4 3 2 1
./push_swap "5 4 3 2 1"   # identical behaviour
```

---

## File structure

```
.
├── Makefile
│
├── push_swap.h                 Main header
├── push_swap_bonus.h           Checker header
│
├── main.c                      Entry point, algorithm selector
├── parsing.c                   Argument parsing and validation
├── utils.c                     ft_atoi, error_exit, ft_putstr_fd, free_split
├── ft_split.c                  String splitting on a delimiter
├── indexing.c                  Normalise values to 0…n-1 indices
│
├── stack_create.c              stack_new, stack_add_back, stack_last, stack_size
├── stack_utils.c               stack_clear, is_sorted, has_duplicates
│
├── operations.c                sa, sb, ss
├── operations_push.c           pa, pb
├── rotate.c                    ra, rb, rr
├── reverse_rotate.c            rra, rrb, rrr
│
├── small_sort.c                sort_two, sort_three
├── small_sort_utils.c          sort_four, sort_five
│
├── butterfly.c                 butterfly_sort — phase 1 (push to B)
├── butterfly_back.c            push_all_to_a — phase 2 (drain B)
├── butterfly_utils.c           get_chunk_size, get_position, find_max_index
│
├── checker_bonus.c             Checker entry point
├── checker_read_bonus.c        checker_get_line — reads one operation from stdin
├── checker_exec_bonus.c        checker_execute — dispatches operation strings
│
└── (bonus mirrors of all source files for the checker binary)
```

---

## Checker (bonus)

The checker reads operation names from stdin, one per line, and replays them on a fresh copy of the input stack. It prints:

- `OK` — stack A is sorted ascending and stack B is empty
- `KO` — any other state
- `Error` (to stderr) — an unrecognised operation, or invalid arguments

```bash
# Normal flow
./push_swap 4 2 3 1 | ./checker 4 2 3 1
# OK

# Detect a wrong sort
echo -e "pb\nsa" | ./checker 3 2 1
# KO

# Detect an invalid operation
echo "jump" | ./checker 3 2 1
# Error
```

---