# push_swap Defense Guide

This file is a practical speaking guide for evaluation day. It follows the actual code in this repository, so you can explain the project confidently without drifting away from what the program really does.

---

## 1. What the project does

`push_swap` receives integers as command-line arguments and sorts them in ascending order on stack A using only the allowed stack operations.

It prints every operation it performs, one per line, to `stdout`.

The bonus program, `checker`, reads operations from `stdin`, replays them on the same input, and prints:

- `OK` if stack A ends sorted and stack B is empty
- `KO` otherwise
- `Error` on invalid input or invalid instructions

The project is judged on:

- correctness
- error handling
- bonus behavior
- number of operations for larger random inputs

---

## 1.1 Complexity cheat sheet

| Area | Practical complexity | Why |
|------|----------------------|-----|
| Parsing | O(n^2) | Duplicate detection compares pairs |
| Indexing | O(n^2) | `assign_index` repeatedly scans for the next minimum |
| Small sorts | O(1) | Fixed-size cases with hard-coded logic |
| Butterfly sort | O(n^2) practical | Repeated scans, rotations, and max lookups in linked lists |
| Checker replay | O(m * n) practical | `m` operations applied over linked-list stacks |

This is the short answer to give if an evaluator suddenly asks for the big picture.

---

## 2. The 11 allowed operations

```text
sa   swap top 2 of A
sb   swap top 2 of B
ss   sa + sb

pa   push top of B onto A
pb   push top of A onto B

ra   rotate A up
rb   rotate B up
rr   ra + rb

rra  reverse rotate A
rrb  reverse rotate B
rrr  rra + rrb
```

Helpful way to explain them:

- `swap` changes the first two nodes
- `push` moves the head node from one list to the other
- `rotate` moves the first node to the end
- `reverse rotate` moves the last node to the front

---

## 3. Data structures

Two structures are used:

```c
typedef struct s_stack
{
	int				value;
	int				index;
	struct s_stack	*next;
}	t_stack;
```

```c
typedef struct s_data
{
	t_stack	*a;
	t_stack	*b;
	int		size;
}	t_data;
```

### What each field means

- `value` is the original integer
- `index` is its rank after normalization
- `next` links to the next node in the stack
- `a` and `b` are the two stacks
- `size` stores the total amount of parsed numbers

### Why linked lists

The project models stacks naturally as singly linked lists.

That makes:

- `push` and `swap` very direct pointer rewires
- memory cleanup simple with `stack_clear`
- stack growth independent from fixed array sizes

Important detail for defense:

- `push` and `swap` are O(1)
- `rotate` and `reverse rotate` are O(n) in this implementation, because the code walks to the tail or pre-tail node

So if someone asks, do not claim all operations are O(1).

---

## 4. Parsing and validation

Parsing is handled by `parse_arguments`.

The program supports both of these forms:

```bash
./push_swap 3 1 2
./push_swap "3 1 2"
```

### Validation path

For each token:

1. `is_valid_number` checks the string format
2. `ft_atoi` converts it safely to `long`
3. the result is checked against `INT_MIN` and `INT_MAX`
4. a node is created and appended to stack A

After parsing:

1. `stack_size` sets `data->size`
2. empty input triggers `error_exit`
3. `has_duplicates` rejects repeated values
4. `assign_index` normalizes values into sorted ranks

### Important detail

This repository's `ft_atoi` uses a sign-aware overflow guard:

- positive numbers compare against `INT_MAX`
- negative numbers compare against `-(long)INT_MIN`

That means valid `INT_MIN` input is accepted.

### Error handling

`error_exit`:

- frees both stacks
- prints `Error\n` to `stderr`
- exits with code `1`

---

## 4.1 Edge case quick table

| Case | Expected behavior |
|------|-------------------|
| No arguments | Exit silently |
| One element | No operations printed |
| Already sorted input | No operations printed |
| Duplicate values | `Error` |
| Non-numeric token | `Error` |
| Empty quoted string | `Error` |
| `INT_MIN` and `INT_MAX` together | Accepted |
| Empty line in checker input | `Error` |

---

## 5. Indexing

Before sorting starts, each node receives an `index` from `0` to `n - 1`.

- smallest value -> `0`
- next smallest -> `1`
- largest value -> `n - 1`

This is useful because the sorting logic can work on relative order instead of raw values.

That makes the algorithm:

- independent from actual integer magnitude
- easier to reason about
- safer for negative values and large ranges

---

## 6. Small sorts

### `sort_two`

If top > next:

```text
sa
```

### `sort_three`

This function uses explicit index-pattern checks.

It does not search for a minimum. It directly matches the index order of the top three nodes and applies the right short sequence.

### `sort_four`

Flow:

1. find the position of the minimum index
2. rotate it to the top
3. `pb`
4. `sort_three`
5. `pa`

### `sort_five`

Flow:

1. find the position of the minimum index
2. rotate it to the top
3. `pb`
4. `sort_four`
5. `pa`

This is simple, readable, and efficient enough for tiny inputs.

---

## 7. Butterfly sort

Inputs larger than 5 elements go through `butterfly_sort`.

### Phase 1: push from A to B

The implementation uses:

- `chunk_size = get_chunk_size(data->size)`
- `next_index = 0`

Then it loops while stack A is not empty.

For the element currently on top of A:

```text
if index <= next_index
    pb
    rb
    next_index++

else if index <= next_index + chunk_size
    pb
    next_index++

else
    ra
```

### Why `rb` after some pushes

Very small indices are pushed and rotated deeper into B because they will be needed later.

Larger indices from the current active window stay closer to the top of B, which helps the rebuild phase.

### Chunk sizes in this code

| Input size | Chunk size |
|------------|------------|
| `<= 10` | `2` |
| `<= 100` | `15` |
| `<= 500` | `32` |
| `> 500` | `45` |

### Phase 2: push back from B to A

`push_all_to_a` works like this:

1. find the maximum index currently in B
2. find its position in B
3. choose the cheaper direction:
   - `rb` if forward is shorter
   - `rrb` if reverse is shorter
4. rotate B until that max is on top
5. `pa`

When repeated until B is empty, A ends sorted in ascending order.

---

## 8. Bonus checker

The bonus checker uses the same parsing rules as `push_swap`.

Then it reads instructions one line at a time from `stdin`.

### Checker flow

1. parse arguments into stack A
2. read one instruction
3. if EOF: stop reading
4. if the line is empty: `Error`
5. if the instruction is unknown: `Error`
6. otherwise execute it silently
7. after EOF:
   - print `OK` if A is sorted and B is empty
   - print `KO` otherwise

### Instruction dispatch

`checker_execute` is split into:

- `run_swap_push`
- `run_rotate`

This keeps the code within norm-friendly function sizes.

---

## 9. Complexity and tradeoffs

### Parsing

- duplicate detection is O(n²)
- index assignment is O(n²)

That is acceptable for project-scale input sizes.

### Sorting

- butterfly phase 1 is driven by repeated scans through stack A via rotations
- butterfly phase 2 repeatedly searches for the max in B and rotates it back

So the overall behavior is still quadratic-style in practice, which is normal for many `push_swap` implementations.

### Implementation tradeoff

This project favors clarity over aggressive micro-optimization:

- code is split by responsibility
- operation families are separated into dedicated files
- the checker is split into read/dispatch/main pieces

---

## 10. Questions evaluators often ask

### Why normalize to indices?

Because the algorithm only needs relative order, not raw values.

### Why use linked lists?

Because push-based stack operations map naturally to node relinking.

### Why not sort directly by value?

Because indices make the butterfly window logic cleaner and independent from number ranges.

### What happens on already sorted input?

`main` checks `is_sorted(data.a)` after parsing and indexing, frees stack A, and exits without printing operations.

### What happens with no arguments?

`main` returns `0` immediately.

### What happens with duplicates?

`has_duplicates` detects them and `error_exit` prints `Error`.

### What happens with invalid checker instructions?

`checker_execute` returns `0`, which triggers `error_exit`.

### Does the checker accept empty lines?

No. In this repository, an empty line is treated as an error.

---

## 11. Good live demos

```bash
# tiny input
./push_swap 3 1 2

# quoted input
./push_swap "5 4 3 2 1"

# already sorted
./push_swap 1 2 3 4 5

# duplicate error
./push_swap 1 2 2 3

# invalid token
./push_swap abc

# int overflow error
./push_swap 2147483648

# valid INT_MIN
./push_swap -2147483648 0 2147483647

# checker success
ARG="4 2 5 1 3"
./push_swap $ARG | ./checker $ARG

# checker invalid instruction
echo "spin" | ./checker 3 2 1
```

---

## 12. Short closing pitch

If you need a compact way to describe the project:

> I parse and validate the input, normalize values to indices, use dedicated sorts for tiny stacks, and switch to a butterfly-style two-phase strategy for larger inputs. The bonus checker replays instructions safely and validates the final state.
