# TrueForge

TrueForge is not the casino product. It is the engineering control layer that coordinates AI coding
agents working on digiCasino: it tracks tasks, enforces architecture rules, and helps deliver the
product quickly with less duplicated work and lower AI usage.

## What TrueForge is (v1)
1. A set of project rules (`AGENTS.md` at the repo root).
2. A master product specification (`PRODUCT_REQUIREMENTS.md`, `SYSTEM_ARCHITECTURE.md`).
3. A task registry (`trueforge/tasks/`).
4. Specialized agent instructions (`trueforge/agents/`).
5. A repeatable execution workflow (`trueforge/workflows/`).
6. A progress and validation system (`PROJECT_STATUS.md`, `AGENT_TASKS.md`).
7. Optional lightweight scripts for task management (`trueforge/scripts/`, currently empty).

The actual coding agents remain responsible for implementing code. TrueForge deliberately does not
build a custom web dashboard, LLM gateway, multi-agent runtime, billing system, vector database,
message queue, separate SaaS backend, autonomous production deployment, or live-money payment
integration in this version. Those may be considered later if the project proves the need.

## The recommended build pipeline
For any non-trivial feature:
1. **Architect** defines the feature, schema, API contract, and acceptance criteria.
2. **Backend + Frontend** work on independent parts of the same approved feature, in parallel, only
   when their interface is already clear.
3. **Game / Wallet specialist** implements the game or financial domain when the feature requires it.
4. **QA / Security** tests the complete flow, checks permissions, and identifies regressions.
5. **Orchestrator** reviews, updates the task registry, and selects the next task.

See `trueforge/workflows/implement-feature.md` for the full workflow this pipeline plugs into, and
`trueforge/workflows/task-prompt-template.md` for the reusable per-task dispatch prompt.

## Anti-pattern: do not run everything at once
Do **not** tell the agents "build the whole casino simultaneously." That produces conflicting
database schemas, duplicate authentication systems, multiple wallet implementations, broken
imports, inconsistent UI, agents editing the same files, and more tokens spent fixing the mess than
were saved by parallelizing.

Instead: use **one orchestrator**, **specialized roles**, a **shared task registry**, and a **gated
implementation pipeline**. Parallelize only independent tasks. Start with one complete vertical
slice (Task 002) before expanding to the rest of the product.

## Cost-control rules
1. Use one orchestrator for planning and coordination.
2. Do not ask every agent to rediscover the entire repository.
3. Maintain shared architecture documentation.
4. Give agents narrowly scoped tasks.
5. Reuse existing code before creating new abstractions.
6. Use lower-cost models for routine tasks when available.
7. Reserve stronger models for architecture, difficult debugging, security, and final review.
8. Do not run multiple agents on the same files simultaneously.
9. Do not repeatedly regenerate completed features.
10. Require tests and concise completion reports.
11. Use sequential execution for dependent tasks.
12. Use parallel execution only for independent tasks.
13. Keep prompts focused on the current task.
14. Avoid sending entire repositories into every prompt unnecessarily.
15. Stop agents when they have completed their assigned scope.

Do not sacrifice security, correctness, or financial integrity merely to reduce token usage.

## Model / cost tiering guidance
Qualitative guidance only — no model IDs are hardcoded here, since the actual model available is a
per-run/runtime choice:

| Work type | Recommended tier |
|---|---|
| Architecture decisions | Stronger model, used selectively |
| Basic UI components | Lower-cost capable model |
| Boilerplate CRUD | Lower-cost capable model |
| Tests and formatting | Lower-cost model or local tools |
| Difficult debugging | Stronger model |
| Security / wallet review | Stronger model + human review |
| Routine code review | Lower-cost review agent |
| Repetitive maintenance | Scheduled/cloud agent, later |

The biggest savings usually come from reducing duplicated context and rework, not simply from
picking the cheapest model.

## Warp-native features (adopt incrementally)
- **Project Rules** — already in use via `AGENTS.md`; keeps non-negotiable architecture/coding rules
  out of every individual task prompt.
- **Agent Profiles** — if the Warp version in use exposes per-role profiles (Architect/Frontend/
  Backend/QA) with distinct instructions, model preferences, and autonomy levels, adopt them once
  the roles in `trueforge/agents/*.md` have stabilized.
- **Saved Workflows** — once the pipeline is proven manually, save parameterized commands for
  `test-feature`, `review-feature`, `start-task`, and `release-check`.
- **MCP servers** — add integrations (GitHub, issue tracking, monitoring, etc.) only when a concrete
  need arises, not speculatively.
- **Cloud Agents / Factories** — consider once the local workflow is proven; they are designed for
  background and repeatable agent workflows and may help with parallel work later.

## Directory map
```
trueforge/
├── README.md                 you are here
├── config/project.yaml       machine-readable project/stack summary
├── agents/                   one file per specialized role
├── tasks/                    backlog / in-progress / review / completed
├── workflows/                plan / implement / review / test / release + task prompt template
├── decisions/                architecture decision records
└── scripts/                  reserved for future lightweight tooling (empty for now)
```
