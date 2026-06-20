import { Request, Response } from "express";
import { workspaceRepository } from "../repositories/WorkspaceRepository";
import { conversationRepository } from "../repositories/ConversationRepository";
import { messageRepository } from "../repositories/MessageRepository";
import { notificationRepository } from "../repositories/NotificationRepository";
import { usageRepository } from "../repositories/UsageRepository";
import { retrievalEngine } from "./../services/RetrievalEngine";
import { llmFactory } from "../services/LLMFactory";
import { ChatPromptSchema } from "../validators";
import { v4 as uuidv4 } from "uuid";
import { Types } from "mongoose";

export class WidgetController {
  async getConfig(req: Request, res: Response) {
    try {
      const { embedId } = req.params;
      const workspace = await workspaceRepository.findByEmbedId(embedId);
      if (!workspace) {
        return res.status(404).json({ error: "Embed configurations not found" });
      }

      return res.json({
        embedId: workspace.embedId,
        color: workspace.color,
        logoUrl: workspace.logoUrl,
        greeting: workspace.greeting,
        language: workspace.language,
        name: workspace.name,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getMessages(req: Request, res: Response) {
    try {
      const { embedId, sessionId } = req.params;
      const workspace = await workspaceRepository.findByEmbedId(embedId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      const conversation = await conversationRepository.findBySessionId(
        workspace._id.toString(),
        sessionId
      );

      if (!conversation) {
        return res.json({ history: [] });
      }

      const rawMessages = await messageRepository.findByConversation(conversation._id.toString());
      const history = rawMessages.map((msg) => ({
        role: msg.senderType === "USER" ? "user" : "assistant",
        content: msg.content,
        sentAt: Math.floor(msg.timestamp.getTime() / 1000),
      }));

      return res.json({ history });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async resetSession(req: Request, res: Response) {
    try {
      const { embedId, sessionId } = req.params;
      const workspace = await workspaceRepository.findByEmbedId(embedId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      const conversation = await conversationRepository.findBySessionId(
        workspace._id.toString(),
        sessionId
      );

      if (conversation) {
        // Delete messages
        await messageRepository.deleteByConversation(conversation._id.toString());
        // Reset conversation status
        await conversationRepository.updateStatus(conversation._id.toString(), "BOT");
        // Clear agent assignment
        await conversationRepository.update(conversation._id.toString(), {
          assignedAgentId: undefined,
        });
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Public Chat endpoint (non-streaming, static response)
   */
  async chat(req: Request, res: Response) {
    try {
      const { embedId } = req.params;
      const validated = ChatPromptSchema.parse(req.body);

      const workspace = await workspaceRepository.findByEmbedId(embedId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      // 1. Get or create conversation record
      let conversation = await conversationRepository.findBySessionId(
        workspace._id.toString(),
        validated.sessionId
      );

      if (!conversation) {
        conversation = await conversationRepository.create({
          workspaceId: workspace._id as Types.ObjectId,
          sessionId: validated.sessionId,
          status: "BOT",
        });
      }

      // 2. Save user message to database
      await messageRepository.create({
        conversationId: conversation._id as Types.ObjectId,
        senderType: "USER",
        senderId: validated.sessionId,
        content: validated.message,
      });

      // 3. Update conversation last activity
      await conversationRepository.update(conversation._id.toString(), {
        lastActivity: new Date(),
      });

      // If human agent takeover is active, bypass LLM
      if (conversation.status === "HUMAN_ACTIVE") {
        return res.json({
          uuid: uuidv4(),
          type: "textResponse",
          textResponse: "Agent has taken over this conversation. Messages are routed directly to the agent.",
          sources: [],
          close: true,
        });
      }

      const llmProvider = llmFactory.getProvider();

      // 4. Detect Handoff
      const isHandoffRequested = await llmProvider.detectHumanHandoff(validated.message);
      if (isHandoffRequested) {
        await conversationRepository.updateStatus(conversation._id.toString(), "WAITING_FOR_AGENT");
        // Create agent notification
        await notificationRepository.create({
          workspaceId: workspace._id as Types.ObjectId,
          type: "WAITING_FOR_AGENT",
          message: `Conversation ${validated.sessionId} requested agent escalation.`,
        });

        const handoffResponse = "I have requested a human support agent. They will take over shortly. Please wait.";
        await messageRepository.create({
          conversationId: conversation._id as Types.ObjectId,
          senderType: "BOT",
          content: handoffResponse,
        });

        return res.json({
          uuid: uuidv4(),
          type: "textResponse",
          textResponse: handoffResponse,
          sources: [],
          close: true,
        });
      }

      // 5. RAG Retrieval
      const { chunks, contextText } = await retrievalEngine.retrieveContext(
        workspace._id.toString(),
        validated.message
      );

      // 6. Map conversation history for LLM
      const rawMessages = await messageRepository.findByConversation(conversation._id.toString());
      const history = rawMessages.slice(-10).map((msg) => ({
        role: (msg.senderType === "USER" ? "user" : "model") as "user" | "model",
        content: msg.content,
      }));

      // 7. Prompt Construction
      const systemPrompt = `
${workspace.systemPrompt || "You are a helpful customer support agent."}

Use the following reference documents to answer the user's questions. If the documents do not contain the answer, reply based on your default knowledge.

--- REFERENCE DOCUMENTS ---
${contextText || "No context documents uploaded."}
`;

      const responseText = await llmProvider.generateResponse(validated.message, {
        model: workspace.model,
        temperature: workspace.temperature,
        systemPrompt,
        history,
      });

      // Save bot response
      await messageRepository.create({
        conversationId: conversation._id as Types.ObjectId,
        senderType: "BOT",
        content: responseText,
      });

      // Track usage
      const today = new Date().toISOString().split("T")[0];
      await usageRepository.incrementUsage(workspace._id.toString(), today, {
        messages: 2,
        tokens: promptLengthEstimate(systemPrompt + validated.message + responseText),
        requests: 1,
      });

      return res.json({
        uuid: uuidv4(),
        type: "textResponse",
        textResponse: responseText,
        sources: chunks.map(c => ({ title: c.metadata?.get("documentName") || "Document", snippet: c.content })),
        close: true,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Public Chat endpoint (Server-Sent Events streaming response)
   */
  async streamChat(req: Request, res: Response) {
    try {
      const { embedId } = req.params;
      const validated = ChatPromptSchema.parse(req.body);

      const workspace = await workspaceRepository.findByEmbedId(embedId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      // Set headers for SSE streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders(); // Establish connection immediately

      // 1. Get or create conversation record
      let conversation = await conversationRepository.findBySessionId(
        workspace._id.toString(),
        validated.sessionId
      );

      if (!conversation) {
        conversation = await conversationRepository.create({
          workspaceId: workspace._id as Types.ObjectId,
          sessionId: validated.sessionId,
          status: "BOT",
        });
      }

      // 2. Save user message to database
      await messageRepository.create({
        conversationId: conversation._id as Types.ObjectId,
        senderType: "USER",
        senderId: validated.sessionId,
        content: validated.message,
      });

      // 3. Update conversation last activity
      await conversationRepository.update(conversation._id.toString(), {
        lastActivity: new Date(),
      });

      const messageUuid = uuidv4();

      // If human agent takeover is active, bypass LLM
      if (conversation.status === "HUMAN_ACTIVE") {
        const text = "Agent is active. Bypassing AI assistant.";
        sendSSEChunk(res, messageUuid, "textResponseChunk", text, false);
        sendSSEChunk(res, messageUuid, "textResponseChunk", "", true);
        return;
      }

      const llmProvider = llmFactory.getProvider();

      // 4. Detect Handoff
      const isHandoffRequested = await llmProvider.detectHumanHandoff(validated.message);
      if (isHandoffRequested) {
        await conversationRepository.updateStatus(conversation._id.toString(), "WAITING_FOR_AGENT");
        
        // Create agent notification
        await notificationRepository.create({
          workspaceId: workspace._id as Types.ObjectId,
          type: "WAITING_FOR_AGENT",
          message: `Conversation ${validated.sessionId} requested agent escalation.`,
        });

        const handoffResponse = "I have requested a human support agent. They will take over shortly. Please wait.";
        
        await messageRepository.create({
          conversationId: conversation._id as Types.ObjectId,
          senderType: "BOT",
          content: handoffResponse,
        });

        sendSSEChunk(res, messageUuid, "textResponseChunk", handoffResponse, false);
        sendSSEChunk(res, messageUuid, "textResponseChunk", "", true);
        return;
      }

      // 5. RAG Retrieval
      const { chunks, contextText } = await retrievalEngine.retrieveContext(
        workspace._id.toString(),
        validated.message
      );

      // 6. Map conversation history for LLM
      const rawMessages = await messageRepository.findByConversation(conversation._id.toString());
      const history = rawMessages.slice(-10).map((msg) => ({
        role: (msg.senderType === "USER" ? "user" : "model") as "user" | "model",
        content: msg.content,
      }));

      // 7. Prompt Construction
      const systemPrompt = `
${workspace.systemPrompt || "You are a helpful customer support agent."}

Use the following reference documents to answer the user's questions. If the documents do not contain the answer, reply based on your default knowledge.

--- REFERENCE DOCUMENTS ---
${contextText || "No context documents uploaded."}
`;

      let fullResponseText = "";
      const mappedSources = chunks.map(c => ({ title: c.metadata?.get("documentName") || "Document", snippet: c.content }));

      // Stream chunks via LLM Provider
      await llmProvider.streamResponse(
        validated.message,
        (chunkText) => {
          fullResponseText += chunkText;
          sendSSEChunk(res, messageUuid, "textResponseChunk", chunkText, false, mappedSources);
        },
        {
          model: workspace.model,
          temperature: workspace.temperature,
          systemPrompt,
          history,
        }
      );

      // Save final streamed response to database
      await messageRepository.create({
        conversationId: conversation._id as Types.ObjectId,
        senderType: "BOT",
        content: fullResponseText,
      });

      // Track usage
      const today = new Date().toISOString().split("T")[0];
      await usageRepository.incrementUsage(workspace._id.toString(), today, {
        messages: 2,
        tokens: promptLengthEstimate(systemPrompt + validated.message + fullResponseText),
        requests: 1,
      });

      // Send close chunk
      sendSSEChunk(res, messageUuid, "textResponseChunk", "", true, mappedSources);
    } catch (error: any) {
      console.error("SSE stream error:", error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
}

function sendSSEChunk(
  res: Response,
  uuid: string,
  type: string,
  text: string,
  close: boolean,
  sources: any[] = []
) {
  const payload = {
    uuid,
    type,
    textResponse: text,
    sources,
    close,
    error: null,
  };
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function promptLengthEstimate(text: string): number {
  // Simple word count multiplier to estimate tokens
  return Math.round(text.split(/\s+/).length * 1.3);
}

export const widgetController = new WidgetController();
