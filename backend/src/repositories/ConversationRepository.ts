import { Conversation, IConversation, ConversationStatus } from "../models/Conversation";
import { Types } from "mongoose";

export class ConversationRepository {
  async findById(id: string): Promise<IConversation | null> {
    return Conversation.findById(id);
  }

  async findBySessionId(workspaceId: string, sessionId: string): Promise<IConversation | null> {
    return Conversation.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      sessionId,
    });
  }

  async findByWorkspace(workspaceId: string): Promise<IConversation[]> {
    return Conversation.find({ workspaceId: new Types.ObjectId(workspaceId) }).sort({ lastActivity: -1 });
  }

  async findByStatus(workspaceId: string, statuses: ConversationStatus[]): Promise<IConversation[]> {
    return Conversation.find({
      workspaceId: new Types.ObjectId(workspaceId),
      status: { $in: statuses },
    }).sort({ lastActivity: -1 });
  }

  async findAllByStatuses(statuses: ConversationStatus[]): Promise<IConversation[]> {
    return Conversation.find({ status: { $in: statuses } }).sort({ lastActivity: -1 });
  }

  async create(convData: Partial<IConversation>): Promise<IConversation> {
    const conversation = new Conversation(convData);
    return conversation.save();
  }

  async update(id: string, updateData: Partial<IConversation>): Promise<IConversation | null> {
    return Conversation.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }

  async updateStatus(id: string, status: ConversationStatus): Promise<IConversation | null> {
    return Conversation.findByIdAndUpdate(
      id,
      { $set: { status, lastActivity: new Date() } },
      { new: true }
    );
  }

  async assignAgent(id: string, agentId: string): Promise<IConversation | null> {
    return Conversation.findByIdAndUpdate(
      id,
      {
        $set: {
          assignedAgentId: new Types.ObjectId(agentId),
          status: "HUMAN_ACTIVE",
          lastActivity: new Date(),
        },
      },
      { new: true }
    );
  }
}

export const conversationRepository = new ConversationRepository();
