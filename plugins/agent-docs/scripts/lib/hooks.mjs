import path from "node:path";
import { inspectRepository } from "./repo.mjs";
import {
  closeReceiptWithHealthWarning,
  createPendingReceipt,
  findReceiptForHook,
  writeHealthWarning,
} from "./state.mjs";

function contextOutput(event, additionalContext) {
  return {
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext,
    },
  };
}

function cliReference(pluginRoot) {
  return path.join(pluginRoot, "scripts", "agent-docs.mjs");
}

function protocolReference(pluginRoot) {
  return path.join(pluginRoot, "protocol", "PROTOCOL.md");
}

export async function runHook(event, input, pluginRoot) {
  const cwd = input.cwd || process.cwd();
  const repo = await inspectRepository(cwd);
  if (!repo.eligible) return {};
  const cli = cliReference(pluginRoot);
  const protocol = protocolReference(pluginRoot);

  if (event === "user-prompt-submit") {
    const receipt = await createPendingReceipt(repo, input);
    return contextOutput(
      "UserPromptSubmit",
      [
        `Agent Docs Turn Receipt ${receipt.identity} is pending for this repository.`,
        `If this turn materially changes requirement state, evidence, risk, or next step, read \`${protocol}\` and follow it through validation and receipt closure.`,
        `If not material, run Node.js with CLI \`${cli}\` and arguments \`receipt resolve --turn-id ${receipt.identity} --state not-material\`.`,
      ].join(" "),
    );
  }

  if (event === "subagent-start") {
    return contextOutput(
      "SubagentStart",
      "Agent Docs uses a single-writer rule. Do not edit docs/agent or Agent Docs Git metadata. Return concise evidence, changed paths, verification commands/results, risks, and proposed next steps to the root agent.",
    );
  }

  if (event === "stop") {
    const receipt = await findReceiptForHook(repo, input);
    if (!receipt || receipt.state !== "pending") return {};
    const active = input.stop_hook_active === true || input.stopHookActive === true;
    if (!active) {
      return {
        decision: "block",
        reason: [
          `Agent Docs Turn Receipt ${receipt.identity} is still pending. This is the one repair pass.`,
          `For material work: read \`${protocol}\`, update the Requirement and evidence, create a Work Session, validate, then resolve with state closed and --session S-....`,
          `For a non-material turn: run Node.js with CLI \`${cli}\` and arguments \`receipt resolve --turn-id ${receipt.identity} --state not-material\`.`,
          "Agent Docs failure must not roll back or reclassify the product Requirement.",
        ].join(" "),
      };
    }

    const reason = "Turn Receipt remained pending after the single Stop repair pass.";
    try {
      await writeHealthWarning(repo, input, receipt, reason);
      await closeReceiptWithHealthWarning(repo, receipt.identity);
      return {
        systemMessage:
          "Agent Docs could not close its Turn Receipt after one repair pass. A Git-metadata Log Health Warning was recorded; product work is not blocked.",
      };
    } catch {
      return {
        systemMessage:
          "Agent Docs could not record its Log Health Warning after one repair pass. Product work is not blocked; report the logging failure to the user.",
      };
    }
  }

  throw new Error(`Unknown hook event: ${event}`);
}
