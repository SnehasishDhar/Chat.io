import { Server, Socket } from "socket.io";
import { conversationRepository } from "../repositories/ConversationRepository";
import { messageRepository } from "../repositories/MessageRepository";
import { workspaceRepository } from "../repositories/WorkspaceRepository";
import { notificationRepository } from "../repositories/NotificationRepository";
import { usageRepository } from "../repositories/UsageRepository";
import { retrievalEngine } from "../services/RetrievalEngine";
import { llmFactory } from "../services/LLMFactory";
import { Types } from "mongoose";

export function setupSockets(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`New socket connection: ${socket.id}`);

    // 1. Join Conversation Room
    socket.on("joinConversation", async (conversationId: string) => {
      socket.join(conversationId);
      console.log(`Socket ${socket.id} joined conversation: ${conversationId}`);
    });

    // 2. Leave Conversation Room
    socket.on("leaveConversation", (conversationId: string) => {
      socket.leave(conversationId);
      console.log(`Socket ${socket.id} left conversation: ${conversationId}`);
    });

    // 3. Send Message
    socket.on(
      "sendMessage",
      async (data: {
        conversationId: string;
        senderType: "USER" | "BOT" | "AGENT";
        senderId?: string;
        content: string;
      }) => {
        try {
          const { conversationId, senderType, senderId, content } = data;

          // Retrieve conversation
          const conversation = await conversationRepository.findById(conversationId);
          if (!conversation) {
            socket.emit("error", { message: "Conversation not found" });
            return;
          }

          // Save message to database
          const savedMessage = await messageRepository.create({
            conversationId: new Types.ObjectId(conversationId),
            senderType,
            senderId,
            content,
          });

          // Broadcast message to all members in the conversation room (including sender)
          io.to(conversationId).emit("receiveMessage", savedMessage);

          // Update last activity
          await conversationRepository.update(conversationId, {
            lastActivity: new Date(),
          });

          // If the message came from USER and conversation is in BOT mode, trigger AI response
          if (senderType === "USER" && conversation.status === "BOT") {
            // Retrieve workspace
            const workspace = await workspaceRepository.findById(conversation.workspaceId.toString());
            if (!workspace) return;

            // Trigger typing indicator
            io.to(conversationId).emit("typing", {
              conversationId,
              senderType: "BOT",
              isTyping: true,
            });

            const llmProvider = llmFactory.getProvider();

            // Detect Handoff
            const isHandoff = await llmProvider.detectHumanHandoff(content);
            if (isHandoff) {
              await conversationRepository.updateStatus(conversationId, "WAITING_FOR_AGENT");

              // Create notification in DB
              const notif = await notificationRepository.create({
                workspaceId: workspace._id as Types.ObjectId,
                type: "WAITING_FOR_AGENT",
                message: `Conversation session ${conversation.sessionId} requires human agent handover.`,
              });

              const handoffMsg = "I am connecting you to a human agent. They will reply shortly.";
              const savedHandoff = await messageRepository.create({
                conversationId: new Types.ObjectId(conversationId),
                senderType: "BOT",
                content: handoffMsg,
              });

              // Stop typing and send handoff details
              io.to(conversationId).emit("typing", {
                conversationId,
                senderType: "BOT",
                isTyping: false,
              });
              io.to(conversationId).emit("receiveMessage", savedHandoff);
              
              // Broadcast waiting status change to agent dashboards
              io.emit("conversationStatusChanged", {
                conversationId,
                status: "WAITING_FOR_AGENT",
                notification: notif,
              });
              return;
            }

            // RAG Retrieval
            const { contextText } = await retrievalEngine.retrieveContext(
              workspace._id.toString(),
              content
            );

            // Fetch history
            const rawMessages = await messageRepository.findByConversation(conversationId);
            const history = rawMessages.slice(-10).map((msg) => ({
              role: (msg.senderType === "USER" ? "user" : "model") as "user" | "model",
              content: msg.content,
            }));

            // Construct system prompt
            const systemPrompt = `
${workspace.systemPrompt || "You are a helpful customer support agent."}

Use the following reference documents to answer the user's questions.

--- REFERENCE DOCUMENTS ---
${contextText || "No context documents uploaded."}
`;

            let botResponseText = "";

            // Stream response chunk-by-chunk through socket
            await llmProvider.streamResponse(
              content,
              (chunk) => {
                botResponseText += chunk;
                io.to(conversationId).emit("aiChunk", {
                  conversationId,
                  text: chunk,
                  done: false,
                });
              },
              {
                model: workspace.model,
                temperature: workspace.temperature,
                systemPrompt,
                history,
              }
            );

            // End chunk stream
            io.to(conversationId).emit("aiChunk", {
              conversationId,
              text: "",
              done: true,
            });

            // Turn off typing indicator
            io.to(conversationId).emit("typing", {
              conversationId,
              senderType: "BOT",
              isTyping: false,
            });

            // Save final bot message
            const savedBotMsg = await messageRepository.create({
              conversationId: new Types.ObjectId(conversationId),
              senderType: "BOT",
              content: botResponseText,
            });

            // Emit full bot message for historical sync
            io.to(conversationId).emit("receiveMessage", savedBotMsg);

            // Increment usage record
            const today = new Date().toISOString().split("T")[0];
            await usageRepository.incrementUsage(workspace._id.toString(), today, {
              messages: 2,
              tokens: Math.round((systemPrompt + content + botResponseText).split(/\s+/).length * 1.3),
              requests: 1,
            });
          }
        } catch (error: any) {
          console.error("Socket message error:", error);
          socket.emit("error", { message: error.message });
        }
      }
    );

    // 4. Typing Indicator
    socket.on("typing", (data: { conversationId: string; senderType: string; isTyping: boolean }) => {
      socket.to(data.conversationId).emit("typing", data);
    });

    // 5. Agent Joined (Takeover)
    socket.on("agentJoined", async (data: { conversationId: string; agentId: string }) => {
      try {
        const { conversationId, agentId } = data;
        await conversationRepository.assignAgent(conversationId, agentId);

        io.to(conversationId).emit("agentJoined", { conversationId, agentId });
        io.emit("conversationStatusChanged", { conversationId, status: "HUMAN_ACTIVE", agentId });
        
        console.log(`Agent ${agentId} took over conversation ${conversationId}`);
      } catch (error: any) {
        socket.emit("error", { message: error.message });
      }
    });

    // 6. Agent Left
    socket.on("agentLeft", (data: { conversationId: string; agentId: string }) => {
      socket.to(data.conversationId).emit("agentLeft", data);
    });

    // 7. Close Conversation
    socket.on("conversationClosed", async (data: { conversationId: string }) => {
      try {
        await conversationRepository.updateStatus(data.conversationId, "CLOSED");
        io.to(data.conversationId).emit("conversationClosed", { conversationId: data.conversationId });
        io.emit("conversationStatusChanged", { conversationId: data.conversationId, status: "CLOSED" });
      } catch (error: any) {
        socket.emit("error", { message: error.message });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
