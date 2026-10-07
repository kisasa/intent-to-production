/**
 * Live probe for the attachment pre-load design: answers, against the real
 * APIs, the questions the documentation leaves open before the pre-load is
 * built into activation-runner.ts.
 *
 *   1. Does an uploads.linear.app URL from the GraphQL API download without
 *      an Authorization header (i.e. is the signature alone enough)?
 *   2. Does countTokens accept file-sourced document blocks, so the pre-flight
 *      check can measure attachments?
 *   3. Can the code execution tool and the MCP connector share one request?
 *   4. Where does a container_upload file land inside the sandbox?
 *   5. Does Claude see a file-sourced PDF as pages (text and visuals)?
 *
 * Operator script, run locally — not part of the unit suite and not run in CI.
 * It spends real tokens and uploads real files (deleted again at the end).
 *
 *   node --env-file=.env --import tsx scripts/probe-attachment-preload.ts <ISSUE> <path/to/file.docx>
 *
 * <ISSUE> is a tracker issue carrying at least one PDF upload. Needs
 * ANTHROPIC_API_KEY, LINEAR_AGENT_API_KEY, CLAUDE_MODEL_INTAKE and CLAUDE_EFFORT,
 * the same variables the listener itself runs on.
 */

import Anthropic, { toFile } from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { createLogger } from "../src/logger.js";
import { requireEnv } from "../src/env.js";

const log = createLogger("probe");

const LINEAR_API = "https://api.linear.app/graphql";
const LINEAR_MCP_URL = "https://mcp.linear.app/mcp";
const MCP_CLIENT_BETA = "mcp-client-2025-04-04";

interface LinearAttachment {
  id: string;
  title: string;
  url: string;
}

interface DownloadedFile {
  title: string;
  mimeType: string;
  bytes: Buffer;
}

async function fetchAttachments(issueId: string, apiKey: string): Promise<LinearAttachment[]> {
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({
      query: `query($id:String!){ issue(id:$id){ attachments { nodes { id title url } } } }`,
      variables: { id: issueId },
    }),
  });
  if (!res.ok) throw new Error(`Linear attachments query failed: ${res.status}`);
  const json = (await res.json()) as { data?: { issue?: { attachments?: { nodes?: LinearAttachment[] } } } };
  return json.data?.issue?.attachments?.nodes ?? [];
}

// Question 1: tries the signed URL bare first, and only falls back to the
// API key if the bare request is refused — the answer is which one worked.
async function download(attachment: LinearAttachment, apiKey: string): Promise<DownloadedFile> {
  let res = await fetch(attachment.url);
  log.info(`Q1 download without Authorization: HTTP ${res.status}`);
  if (!res.ok) {
    res = await fetch(attachment.url, { headers: { Authorization: apiKey } });
    log.info(`Q1 download with Authorization: HTTP ${res.status}`);
  }
  if (!res.ok) throw new Error(`download of "${attachment.title}" failed: ${res.status}`);
  return {
    title: attachment.title,
    mimeType: res.headers.get("content-type") ?? "application/octet-stream",
    bytes: Buffer.from(await res.arrayBuffer()),
  };
}

async function main(): Promise<void> {
  const [issueId, docxPath] = process.argv.slice(2);
  if (!issueId || !docxPath) {
    throw new Error("usage: probe-attachment-preload.ts <ISSUE> <path/to/file.docx>");
  }
  const linearKey = requireEnv("LINEAR_AGENT_API_KEY");
  const model = requireEnv("CLAUDE_MODEL_INTAKE");
  const effort = requireEnv("CLAUDE_EFFORT");

  const attachments = await fetchAttachments(issueId, linearKey);
  log.info(`issue ${issueId}: ${attachments.length} attachment(s)`);
  const uploads = attachments.filter((a) => a.url.startsWith("https://uploads.linear.app/"));

  let pdf: DownloadedFile | null = null;
  for (const candidate of uploads) {
    const file = await download(candidate, linearKey);
    log.info(`  "${file.title}": ${file.mimeType}, ${file.bytes.length} bytes`);
    if (file.mimeType === "application/pdf") {
      pdf = file;
      break;
    }
  }
  if (!pdf) throw new Error(`no PDF upload found on ${issueId}`);

  const client = new Anthropic();
  const uploadedIds: string[] = [];
  try {
    const pdfFile = await client.files.upload({
      file: await toFile(pdf.bytes, "evidence.pdf", { type: "application/pdf" }),
      expires_in_seconds: 3600,
    });
    uploadedIds.push(pdfFile.id);
    const docxFile = await client.files.upload({
      file: await toFile(await readFile(docxPath), basename(docxPath), {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      expires_in_seconds: 3600,
    });
    uploadedIds.push(docxFile.id);
    log.info(`uploaded pdf=${pdfFile.id} docx=${docxFile.id}`);

    const pdfBlock = { type: "document", source: { type: "file", file_id: pdfFile.id }, title: pdf.title };

    // Question 2.
    try {
      const counted = await client.messages.countTokens({
        model: model,
        messages: [{ role: "user", content: [pdfBlock, { type: "text", text: "count" }] }],
      } as unknown as Anthropic.MessageCountTokensParams);
      log.info(`Q2 countTokens with a file-sourced PDF: ${counted.input_tokens} tokens`);
    } catch (err) {
      log.warn(`Q2 countTokens with a file-sourced PDF failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Questions 3–5 in one request, shaped like an activation: same beta
    // stream, same MCP beta, plus the code execution tool.
    const prompt = [
      "This is a capability probe, not a real task. Do exactly these three things and report each result plainly.",
      "1. The attached PDF: say how many pages it has, quote the heading text of page 1, and describe one purely visual detail of page 1 (a colour, a shape, a layout element) that the text alone would not tell you.",
      `2. Using code execution: run \`pwd\` and \`find / -name '${basename(docxPath)}' 2>/dev/null\`, report the full path of the uploaded .docx, then open it with python-docx and print its paragraphs.`,
      `3. Using the Linear connector: fetch issue ${issueId} and report its title only. Make no writes of any kind.`,
    ].join("\n");

    const stream = client.beta.messages.stream({
      model: model,
      max_tokens: 16_000,
      thinking: { type: "adaptive" },
      output_config: { effort: effort },
      mcp_servers: [{ type: "url", url: LINEAR_MCP_URL, name: "linear", authorization_token: linearKey }],
      tools: [{ type: "code_execution_20260521", name: "code_execution" }],
      messages: [
        {
          role: "user",
          content: [pdfBlock, { type: "container_upload", file_id: docxFile.id }, { type: "text", text: prompt }],
        },
      ],
      betas: [MCP_CLIENT_BETA],
    } as unknown as Parameters<typeof client.beta.messages.stream>[0]);

    const message = await stream.finalMessage();
    log.info(`Q3 request accepted: stop_reason=${message.stop_reason}`);
    log.info(`content block types: [${message.content.map((b) => b.type).join(", ")}]`);
    for (const block of message.content) {
      if (block.type === "text") log.info(`text: ${block.text}`);
      else if (block.type !== "thinking") log.info(`${block.type}: ${JSON.stringify(block).slice(0, 2000)}`);
    }
    log.info(`usage: ${JSON.stringify(message.usage)}`);
  } finally {
    for (const id of uploadedIds) {
      await client.files.delete(id).catch((err: unknown) => log.warn(`could not delete ${id}: ${String(err)}`));
    }
    log.info(`deleted ${uploadedIds.length} uploaded file(s)`);
  }
}

main().catch((err: unknown) => {
  log.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exitCode = 1;
});
