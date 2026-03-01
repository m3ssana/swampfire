# Agents

## What Are Agents?

Agents are specialized AI assistants that are optimized to help with specific types of work. Think of them like hiring a specialist consultant—instead of having one generalist who knows a little about everything, you have focused experts, each bringing deep knowledge and best practices in their area.

Each agent has:
- **Specialized knowledge** in their domain
- **A clear set of responsibilities** they excel at
- **A consistent personality** that shapes how they approach problems
- **Memory** that lets them learn from previous conversations and make better decisions over time

## How Are Agents Used?

When you ask Claude for help, it can recognize when your request would benefit from a specialist and route you to the right agent. For example:

- If you ask about fixing a broken GitHub Actions workflow → DevOps Agent
- If you ask about game mechanics or design → UX Game Designer Agent

Once you're working with an agent, they'll bring their expertise to bear—providing better solutions, asking smarter questions, and remembering context from conversation to conversation.

## Current Agents

Each agent is defined in a markdown file (e.g., `devops.md`, `ux-game-designer.md`). These files contain:

- **Who they are**: Their background, expertise, and personality
- **What they do**: Their core responsibilities and when to use them
- **How they work**: Their approach to solving problems and their standards for quality
- **What they remember**: How they learn from past work to improve future work

## Adding or Updating Agents

When agents are added, updated, or removed, their definitions are kept in this folder. This README stays high-level and doesn't need to change—the system remains the same, only the specialists in the roster evolve.

---

**For details on what each specific agent does**, refer to their individual markdown files in this folder.
