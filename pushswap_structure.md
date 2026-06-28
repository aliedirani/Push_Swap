# push_swap Structure Diagrams

This page collects the rendered Mermaid diagrams for the repository so GitHub can preview the project flow directly.

---

## 1. Mandatory flow

```mermaid
flowchart TD
    A["main.c"] --> B{"ac < 2?"}
    B -- "yes" --> X["exit 0"]
    B -- "no" --> C["parse_arguments"]
    C --> D["validate tokens"]
    D --> E["build stack A"]
    E --> F["has_duplicates"]
    F --> G["assign_index"]
    G --> H{"already sorted?"}
    H -- "yes" --> I["free stack A and exit"]
    H -- "no" --> J{"size selector"}

    J -- "2" --> K["sort_two"]
    J -- "3" --> L["sort_three"]
    J -- "4" --> M["sort_four"]
    J -- "5" --> N["sort_five"]
    J -- "> 5" --> O["butterfly_sort"]

    O --> P["Phase 1: push to B"]
    P --> Q["chunk_size = 2 / 15 / 32 / 45"]
    Q --> R["next_index sliding window"]
    R --> S["pb + optional rb, or ra"]
    S --> T["Phase 2: drain B back to A"]
    T --> U["find max in B"]
    U --> V["rotate with rb or rrb"]
    V --> W["pa until B is empty"]
```

---

## 2. Butterfly detail

```mermaid
flowchart LR
    START["top node of A"] --> CHECK1{"index <= next_index?"}
    CHECK1 -- "yes" --> PUSH_DEEP["pb then rb"]
    PUSH_DEEP --> INC1["next_index++"]

    CHECK1 -- "no" --> CHECK2{"index <= next_index + chunk_size?"}
    CHECK2 -- "yes" --> PUSH_SHALLOW["pb"]
    PUSH_SHALLOW --> INC2["next_index++"]

    CHECK2 -- "no" --> ROTATE_A["ra"]

    INC1 --> LOOP{"A empty?"}
    INC2 --> LOOP
    ROTATE_A --> LOOP

    LOOP -- "no" --> START
    LOOP -- "yes" --> BACK["push_all_to_a"]
    BACK --> MAX["find max index in B"]
    MAX --> DIR{"rb or rrb?"}
    DIR --> PA["rotate to max, then pa"]
    PA --> DONE{"B empty?"}
    DONE -- "no" --> MAX
    DONE -- "yes" --> SORTED["A sorted"]
```

---

## 3. File and module map

```mermaid
flowchart LR
    MAIN["main.c"] --> PARSE["parsing.c"]
    MAIN --> SMALL["small_sort.c + small_sort_utils.c"]
    MAIN --> BUTTER["butterfly.c"]
    MAIN --> STACKU["stack_utils.c"]

    PARSE --> SPLIT["ft_split.c"]
    PARSE --> UTILS["utils.c"]
    PARSE --> STACKC["stack_create.c"]
    PARSE --> INDEX["indexing.c"]

    SMALL --> OPS["operations.c"]
    SMALL --> PUSH["operations_push.c"]
    SMALL --> ROT["rotate.c"]
    SMALL --> RROT["reverse_rotate.c"]

    BUTTER --> BUTIL["butterfly_utils.c"]
    BUTTER --> BBACK["butterfly_back.c"]
    BUTTER --> PUSH
    BUTTER --> ROT

    BBACK --> BUTIL
    BBACK --> PUSH
    BBACK --> ROT
    BBACK --> RROT

    CHECK["checker_bonus.c"] --> CHECKREAD["checker_read_bonus.c"]
    CHECK --> CHECKEXEC["checker_exec_bonus.c"]
    CHECK --> PARSEB["parsing_bonus.c"]
```

---

## 4. Data structures

```mermaid
classDiagram
    class t_data {
        +t_stack* a
        +t_stack* b
        +int size
    }

    class t_stack {
        +int value
        +int index
        +t_stack* next
    }

    t_data "1" --> "0..*" t_stack : a
    t_data "1" --> "0..*" t_stack : b
    t_stack --> t_stack : next
```

### Stack memory example

```mermaid
flowchart LR
    DATA["t_data\na ->\nb ->\nsize = 3"] --> N1
    DATA --> NULL_B

    subgraph A["Stack A (top -> bottom)"]
        direction TB
        N1["value = 5\nindex = 2"] --> N2["value = 3\nindex = 1"] --> N3["value = 1\nindex = 0"] --> NULL_A["NULL"]
    end

    subgraph B["Stack B"]
        NULL_B["NULL"]
    end
```

---

## 5. Bonus checker flow

```mermaid
sequenceDiagram
    participant User
    participant Checker as checker_bonus.c
    participant Reader as checker_read_bonus.c
    participant Exec as checker_exec_bonus.c
    participant Ops as stack operations

    User->>Checker: ./checker <args>
    Checker->>Checker: parse_arguments
    loop until EOF
        Checker->>Reader: checker_get_line()
        Reader-->>Checker: instruction line
        Checker->>Exec: checker_execute(line)
        Exec->>Ops: replay valid operation silently
        Ops-->>Exec: updated stacks
        Exec-->>Checker: success / failure
    end
    Checker->>Checker: is_sorted(a) && b == NULL
    Checker-->>User: OK / KO / Error
```

---

## 6. Complexity reference

| Area | Practical complexity | Why |
|------|----------------------|-----|
| Parsing | O(n^2) | Duplicate detection compares pairs |
| Indexing | O(n^2) | `assign_index` repeatedly scans for the next minimum |
| Small sorts | O(1) | Fixed-size cases with dedicated logic |
| Butterfly phase 1 | O(n^2) practical | Rotations and repeated window checks on linked lists |
| Butterfly phase 2 | O(n^2) practical | Repeated max search plus `rb`/`rrb` rotations |
| `push` / `swap` | O(1) | Head-node rewiring |
| `rotate` / `reverse rotate` | O(n) | Tail or pre-tail traversal is required |
